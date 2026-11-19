/* Penn Events runtime for Vercel. Gives the page the small data/user/extraction interface it was
   built against, backed by /api/*. All access rules are enforced on the server, not here. */
(function () {
  var session = null;
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts)).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ('http_' + r.status)); e.code = j.error || ('http_' + r.status); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function getSession() { return session || (session = api('/api/session').catch(function () { return { admin: false, extraction: false }; })); }

  function docSnap(id, row) { return { id: id, exists: !!row, data: function () { return row ? JSON.parse(JSON.stringify(row.data)) : undefined; } }; }
  var watchers = {};
  function refresh(coll) { (watchers[coll] || []).slice().forEach(function (w) { w.poll(); }); }
  function docRef(coll, id) {
    var q = '/api/db?c=' + encodeURIComponent(coll) + '&id=' + encodeURIComponent(id);
    return {
      id: id,
      get: function () { return api(q).then(function (r) { return docSnap(id, r && r.data ? r : null); }); },
      set: function (v) { return api(q, { method: 'PUT', body: JSON.stringify({ data: v }) }).then(function (r) { refresh(coll); return r; }); },
      update: function (v) { return api(q, { method: 'PATCH', body: JSON.stringify({ data: v }) }).then(function (r) { refresh(coll); return r; }); },
      delete: function () { return api(q, { method: 'DELETE' }).then(function (r) { refresh(coll); return r; }); }
    };
  }
  function collection(coll) {
    return {
      doc: function (id) { return docRef(coll, id); },
      onSnapshot: function (cb, err) {
        var stopped = false, timer = null, last = '';
        var w = { poll: function () {
          api('/api/db?c=' + encodeURIComponent(coll)).then(function (r) {
            if (stopped) return;
            var sig = JSON.stringify(r.docs.map(function (d) { return [d.id, d.version]; }));
            if (sig === last) return; last = sig;
            cb({ docs: r.docs.map(function (d) { return docSnap(d.id, d); }), metadata: { fromCache: false } });
          }).catch(function (e) { if (!stopped && err) err(e); });
        } };
        (watchers[coll] = watchers[coll] || []).push(w);
        w.poll();
        timer = setInterval(function () { if (!document.hidden) w.poll(); }, coll === 'events' ? 30000 : 10000);
        return function () { stopped = true; clearInterval(timer); watchers[coll] = (watchers[coll] || []).filter(function (x) { return x !== w; }); };
      }
    };
  }
  var db = {
    collection: collection,
    doc: function (path) { var p = String(path).split('/'); return docRef(p[0], p[1]); }
  };
  var user = {
    isOwner: function () { return getSession().then(function (s) { return !!s.admin; }); },
    canEdit: function () { return getSession().then(function (s) { return !!s.admin; }); },
    id: function () { return Promise.resolve('admin'); },
    me: function () { return Promise.resolve({ id: 'admin' }); }
  };
  function blobToB64(b) {
    return new Promise(function (res, rej) { var f = new FileReader(); f.onload = function () { res({ type: b.type, data: String(f.result).split(',')[1] }); }; f.onerror = rej; f.readAsDataURL(b); });
  }
  var sample = function () { return Promise.reject(new Error('use sample.json')); };
  sample.limits = function () { return Promise.resolve({ images: true }); };
  sample.json = function (prompt, opts) {
    opts = opts || {};
    return Promise.all((opts.images || []).map(blobToB64)).then(function (images) {
      return api('/api/extract', { method: 'POST', body: JSON.stringify({ prompt: prompt + '\n\nReturn only the JSON object, with no other text.', images: images }) });
    }).then(function (r) {
      var t = String(r.text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      return JSON.parse(t);
    });
  };
  window.claude = { use: function (name) {
    if (name === 'db') return Promise.resolve(db);
    if (name === 'user') return Promise.resolve(user);
    if (name === 'sample') return getSession().then(function (s) { return s.admin && s.extraction ? sample : null; });
    return Promise.resolve(null);
  } };

  /* Admin sign-in panel, shown at /#admin when not signed in. */
  function showLogin() {
    if (document.getElementById('pe-login')) return;
    var d = document.createElement('div'); d.id = 'pe-login';
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'pe-login-h');
    d.style.cssText = 'position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:rgba(31,31,31,.45);padding:16px;font-family:"Google Sans Text",Roboto,Arial,sans-serif';
    d.innerHTML = '<form id="pe-login-form" style="background:#fff;border-radius:28px;padding:24px;width:min(360px,100%);display:flex;flex-direction:column;gap:12px;box-shadow:0 4px 8px 3px rgba(0,0,0,.15)">' +
      '<h2 id="pe-login-h" style="margin:0;font:400 22px \'Google Sans\',Roboto,Arial,sans-serif;color:#1f1f1f">Admin sign in</h2>' +
      '<label for="pe-pw" style="font-size:14px;color:#444746">Password</label>' +
      '<input id="pe-pw" type="password" autocomplete="current-password" required style="min-height:44px;padding:0 14px;border:1px solid #747775;border-radius:8px;font:inherit;font-size:16px">' +
      '<p id="pe-login-err" role="alert" style="margin:0;min-height:18px;font-size:13px;color:#b3261e"></p>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><a href="#home" id="pe-login-cancel" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;color:#0b57d0;font-weight:500;text-decoration:none">Cancel</a>' +
      '<button type="submit" style="min-height:44px;padding:0 24px;border:0;border-radius:20px;background:#0b57d0;color:#fff;font:500 14px \'Google Sans\',Roboto,Arial,sans-serif;cursor:pointer">Sign in</button></div></form>';
    document.body.appendChild(d);
    var pw = d.querySelector('#pe-pw'); pw.focus();
    d.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/login', { method: 'POST', body: JSON.stringify({ password: pw.value }) }).then(function () { location.reload(); }, function (er) {
        d.querySelector('#pe-login-err').textContent = er.status === 429 ? 'Too many attempts. Try again in a few minutes.' : 'That password is not right.';
        pw.select();
      });
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') location.hash = 'home'; });
  }
  function hideLogin() { var d = document.getElementById('pe-login'); if (d) d.remove(); }
  function check() { if (location.hash === '#admin') getSession().then(function (s) { if (!s.admin && location.hash === '#admin') showLogin(); }); else hideLogin(); }
  window.addEventListener('hashchange', check);
  document.addEventListener('DOMContentLoaded', check);
  window.peSignOut = function () { return api('/api/logout', { method: 'POST' }).then(function () { location.href = '/#home'; location.reload(); }); };
})();
