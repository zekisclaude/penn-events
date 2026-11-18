// Test double for the artifact runtime (window.claude). Enforces the same
// access rules the deployed page declares, so UI behaviour per role is real.
(() => {
  const ROLE = window.__ROLE || 'admin'; // admin | interact | view | signedout
  const LV = { view: 0, interact: 1, admin: 2 };
  const RULES = [
    { path: 'events', read: 'view', write: 'admin' },
    { path: 'review', read: 'admin', write: 'admin' },
    { path: 'sources', read: 'admin', write: 'admin' },
    { path: 'ingest', read: 'admin', write: 'admin' },
    { path: 'metrics', read: 'interact', write: 'interact' },
  ];
  const KEY = '__mockdb';
  const load = () => JSON.parse(localStorage.getItem(KEY) || 'null') || JSON.parse(JSON.stringify(window.__SEED || {}));
  let store = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(store));
  const subs = [];
  const can = (coll, act) => {
    const r = RULES.find((x) => x.path === coll) || { read: 'view', write: 'admin' };
    return LV[ROLE] >= LV[r[act]];
  };
  const deny = (what) => Object.assign(new Error('permission_denied: ' + what), { code: 'permission_denied' });
  const snap = (coll) => ({
    docs: Object.entries(store[coll] || {}).map(([id, d]) => ({ id, exists: true, data: () => JSON.parse(JSON.stringify(d)) })),
    metadata: { fromCache: false },
  });
  const notify = (coll) => subs.filter((s) => s.coll === coll).forEach((s) => setTimeout(() => s.cb(snap(coll)), 0));
  const docRef = (path) => {
    const [coll, id] = path.split('/');
    return {
      id,
      async get() {
        if (!can(coll, 'read')) throw deny('read ' + path);
        const d = (store[coll] || {})[id];
        return { id, exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) };
      },
      async set(v) {
        if (!can(coll, 'write')) { (window.__DENIED ||= []).push('set ' + path); throw deny('write ' + path); }
        (store[coll] ||= {})[id] = JSON.parse(JSON.stringify(v)); save(); notify(coll);
      },
      async update(v) {
        if (!can(coll, 'write')) { (window.__DENIED ||= []).push('update ' + path); throw deny('write ' + path); }
        if (!(store[coll] || {})[id]) throw new Error('not_found ' + path);
        Object.assign(store[coll][id], JSON.parse(JSON.stringify(v))); save(); notify(coll);
      },
      async delete() {
        if (!can(coll, 'write')) throw deny('write ' + path);
        delete (store[coll] || {})[id]; save(); notify(coll);
      },
    };
  };
  const db = {
    doc: docRef,
    collection: (coll) => ({
      doc: (id) => docRef(coll + '/' + id),
      async get() { if (!can(coll, 'read')) throw deny('read ' + coll); return snap(coll); },
      onSnapshot(cb, err) {
        if (!can(coll, 'read')) { setTimeout(() => err && err(deny('read ' + coll)), 0); return () => {}; }
        const s = { coll, cb }; subs.push(s); setTimeout(() => cb(snap(coll)), 0);
        return () => subs.splice(subs.indexOf(s), 1);
      },
    }),
  };
  const user = {
    isOwner: async () => ROLE === 'admin', canEdit: async () => ROLE === 'admin',
    id: async () => 'u_test', me: async () => ({ id: 'u_test' }),
  };
  const sample = Object.assign(async () => ({ text: '' }), {
    limits: async () => ({ images: true }),
    json: async (prompt) => { (window.__SAMPLE_CALLS ||= []).push(prompt); return window.__SAMPLE_RESULT || { items: [] }; },
  });
  window.claude = {
    use: async (n) => (ROLE === 'signedout' ? null : n === 'db' ? db : n === 'user' ? user : n === 'sample' ? (ROLE === 'admin' ? sample : null) : null),
  };
  window.__mockStore = () => JSON.parse(JSON.stringify(store));
})();
