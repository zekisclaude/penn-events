/* Penn Events: calendar-style student finder.
   Spliced into the built bundle in place of the original finder (function Lg).
   Uses helpers already defined in the bundle's module scope:
   E (React), an (safe localStorage), pi (categories), Ql (category labels),
   Ih (filter + sort upcoming events for a week), Mh (group by day), je (event times),
   Bd (week range), Us (add days to a date key), Ae (Philadelphia date key), Fr (Philadelphia parts),
   ke (time), Oe (short date), Wo (eligibility sentence), Ws/Gd/qd/pg/mg/Zd (shared event parts),
   Ut (pilot analytics). */
const PE_h = E.createElement;
const PE_FKEY = "pe.filters.v2";
const PE_MAXWEEK = 8;
const PE_HOURPX = 48;
// Google Calendar event colors (darkened where needed so white text stays at WCAG AA)
const PE_CAT = {
  finance: "#0B8043",          // Basil
  consulting: "#3F51B5",       // Blueberry
  tech: "#D50000",             // Tomato
  entrepreneurship: "#D84315", // Tangerine, darker
  healthcare: "#00796B",       // Eucalyptus
  career: "#0277BD",           // Peacock, darker
  academic: "#5E35B1",         // Lavender, darker
  culture: "#8E24AA",          // Grape
  social: "#C2185B",           // Flamingo, darker
  arts: "#795548",             // Cocoa
  service: "#558B2F",          // Sage, darker
  other: "#616161",            // Graphite
};
const PE_YEARS = { all: "All", "first-year": "First-year", sophomore: "Sophomore" };
const PE_YEAR_PLURAL = { "first-year": "first-years", sophomore: "sophomores" };
const PE_ICON = {
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  close: ["M18 6 6 18", "m6 6 12 12"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"],
  pin: ["M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  people: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  ticket: ["M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z", "M13 5v2", "M13 17v2", "M13 11v2"],
  org: ["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 21v-6h6v6"],
  open: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  check: "M20 6 9 17l-5-5",
  text: ["M17 6H3", "M21 12H3", "M15 18H3"],
};
function PE_Icon({ name, size = 20 }) {
  const d = [].concat(PE_ICON[name]);
  return PE_h(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false", className: "gc-icon" },
    ...d.map((p, i) => PE_h("path", { d: p, key: i }))
  );
}
function PE_loadFilters() {
  const d = { week: 0, year: "all", interests: [], q: "", view: null };
  try {
    const raw = an.get(PE_FKEY) || an.get("pe.filters.v1");
    if (!raw) return d;
    const t = JSON.parse(raw);
    return {
      week: Number.isInteger(t.week) && t.week >= 0 && t.week <= PE_MAXWEEK ? t.week : 0,
      year: t.year === "first-year" || t.year === "sophomore" ? t.year : "all",
      interests: Array.isArray(t.interests) ? t.interests.filter((n) => pi.includes(n)) : [],
      q: typeof t.q == "string" ? t.q.slice(0, 80) : "",
      view: t.view === "week" || t.view === "schedule" ? t.view : null,
    };
  } catch {
    return d;
  }
}
function PE_keyUTC(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
const PE_fmtMonthDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric" });
const PE_fmtMonthYear = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const PE_fmtMonShort = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
const PE_fmtWk = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const PE_fmtWkLong = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
function PE_dayInfo(key) {
  const d = PE_keyUTC(key);
  return { key, num: d.getUTCDate(), wk: PE_fmtWk.format(d), mon: PE_fmtMonShort.format(d), long: PE_fmtWkLong.format(d) };
}
function PE_title(startKey, endKey) {
  const a = PE_keyUTC(startKey), b = PE_keyUTC(endKey);
  if (a.getUTCMonth() === b.getUTCMonth()) return PE_fmtMonthYear.format(a);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${PE_fmtMonShort.format(a)} – ${PE_fmtMonShort.format(b)} ${b.getUTCFullYear()}`;
  return `${PE_fmtMonShort.format(a)} ${a.getUTCFullYear()} – ${PE_fmtMonShort.format(b)} ${b.getUTCFullYear()}`;
}
function PE_color(ev) {
  return PE_CAT[ev.categories && ev.categories[0]] || PE_CAT.other;
}
function PE_timeText(ev, now) {
  const { start, end } = je(ev, now);
  if (!start) return "Date not confirmed";
  if (!end) return ke(start);
  return Ae(start) !== Ae(end) ? `${ke(start)} – ${Oe(end)}, ${ke(end)}` : `${ke(start)} – ${ke(end)}`;
}
function PE_minutes(d) {
  const p = Fr(d);
  return p.hour * 60 + p.minute;
}
function PE_wide() {
  try {
    return window.matchMedia("(min-width: 768px)").matches;
  } catch {
    return false;
  }
}

/* ---------- Mini month (sidebar) ---------- */
function PE_MiniMonth({ now, week, setWeek, eventDays }) {
  const visible = Bd(now, week);
  const base = Bd(now, 0).start;
  const init = () => {
    const d = PE_keyUTC(Us(visible.start, 3));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  };
  const [mm, setMm] = E.useState(init);
  E.useEffect(() => setMm(init()), [visible.start]);
  const first = new Date(Date.UTC(mm.y, mm.m, 1, 12));
  const firstKey = `${mm.y}-${String(mm.m + 1).padStart(2, "0")}-01`;
  const lead = (first.getUTCDay() + 6) % 7;
  const gridStart = Us(firstKey, -lead);
  const todayKey = Ae(now);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const key = Us(gridStart, i);
    const diff = Math.round((PE_keyUTC(key) - PE_keyUTC(base)) / 864e5);
    const w = Math.floor(diff / 7);
    const inMonth = PE_keyUTC(key).getUTCMonth() === mm.m;
    const inWeek = key >= visible.start && key <= visible.end;
    const ok = w >= 0 && w <= PE_MAXWEEK;
    const info = PE_dayInfo(key);
    cells.push(
      PE_h(
        "button",
        {
          key,
          type: "button",
          className: "gc-mm-day" + (inMonth ? "" : " gc-mm-out") + (inWeek ? " gc-mm-inweek" : "") + (key === todayKey ? " gc-mm-today" : ""),
          disabled: !ok,
          "aria-label": `${info.long}${eventDays.has(key) ? ", has events" : ""}. Show that week.`,
          onClick: () => setWeek(w),
        },
        PE_h("span", { className: "gc-mm-num" }, info.num),
        eventDays.has(key) ? PE_h("span", { className: "gc-mm-dot", "aria-hidden": true }) : null
      )
    );
  }
  const shift = (n) => setMm(({ y, m }) => {
    const t = m + n;
    return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
  });
  return PE_h(
    "div",
    { className: "gc-mm", "aria-label": "Month overview" },
    PE_h(
      "div",
      { className: "gc-mm-head" },
      PE_h("span", { className: "gc-mm-title" }, PE_fmtMonthYear.format(first)),
      PE_h("button", { type: "button", className: "gc-iconbtn gc-iconbtn-sm", "aria-label": "Previous month", onClick: () => shift(-1) }, PE_h(PE_Icon, { name: "left", size: 16 })),
      PE_h("button", { type: "button", className: "gc-iconbtn gc-iconbtn-sm", "aria-label": "Next month", onClick: () => shift(1) }, PE_h(PE_Icon, { name: "right", size: 16 }))
    ),
    PE_h(
      "div",
      { className: "gc-mm-grid" },
      ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => PE_h("span", { key: "h" + i, className: "gc-mm-wk", "aria-hidden": true }, d)),
      cells
    )
  );
}

/* ---------- Quick-view popover (desktop) ---------- */
function PE_Popover({ ev, now, anchor, onClose, onOpen }) {
  const ref = E.useRef(null);
  const closeRef = E.useRef(null);
  const [pos, setPos] = E.useState({ left: -9999, top: 0 });
  E.useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const box = ref.current.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    let left = r.right + 8;
    if (left + box.width > W - 16) left = r.left - box.width - 8;
    left = Math.max(16, Math.min(left, W - box.width - 16));
    const top = Math.max(16, Math.min(r.top, H - box.height - 16));
    setPos({ left, top });
    closeRef.current && closeRef.current.focus();
  }, [anchor, ev.id]);
  E.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    const s = () => onClose();
    window.addEventListener("keydown", k);
    window.addEventListener("resize", s);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("resize", s); };
  }, [onClose]);
  const { start } = je(ev, now);
  const dateLine = start ? `${PE_dayInfo(Ae(start)).long} · ${PE_timeText(ev, now)}` : "Date not confirmed";
  const titleId = "gc-pop-title";
  return PE_h(
    E.Fragment,
    null,
    PE_h("div", { className: "gc-pop-backdrop", onClick: onClose, "aria-hidden": true }),
    PE_h(
      "div",
      { ref, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, className: "gc-pop", style: { left: pos.left, top: pos.top } },
      PE_h(
        "div",
        { className: "gc-pop-actions" },
        PE_h("a", { href: "#e-" + ev.id, className: "gc-iconbtn", "aria-label": "Open event page", title: "Open event page", onClick: (e) => { e.preventDefault(); onClose(); onOpen(ev.id); } }, PE_h(PE_Icon, { name: "open", size: 18 })),
        PE_h("button", { ref: closeRef, type: "button", className: "gc-iconbtn", "aria-label": "Close", onClick: onClose }, PE_h(PE_Icon, { name: "close", size: 18 }))
      ),
      PE_h(
        "div",
        { className: "gc-pop-row gc-pop-headrow" },
        PE_h("span", { className: "gc-pop-swatch", style: { background: PE_color(ev) }, "aria-hidden": true }),
        PE_h("div", null, PE_h("h2", { id: titleId, className: "gc-pop-title" }, ev.title), PE_h("p", { className: "gc-pop-date" }, dateLine))
      ),
      PE_h("div", { className: "gc-pop-row" }, PE_h(PE_Icon, { name: "people" }), PE_h("div", null, PE_h(Ws, { e: ev, compact: !0 }))),
      PE_h("div", { className: "gc-pop-row" }, PE_h(PE_Icon, { name: "ticket" }), PE_h("div", null, PE_h(Gd, { e: ev, now }))),
      PE_h("div", { className: "gc-pop-row" }, PE_h(PE_Icon, { name: "pin" }), PE_h("div", null, ev.online ? "Online" : ev.location || "Location not announced")),
      PE_h("div", { className: "gc-pop-row" }, PE_h(PE_Icon, { name: "org" }), PE_h("div", null, ev.organizer)),
      ev.description ? PE_h("div", { className: "gc-pop-row" }, PE_h(PE_Icon, { name: "text" }), PE_h("p", { className: "gc-pop-desc" }, ev.description)) : null,
      PE_h("div", { className: "gc-pop-row gc-pop-cats" }, PE_h("span", { className: "gc-icon-spacer" }), PE_h(PE_Cats, { e: ev })),
      PE_h(
        "div",
        { className: "gc-pop-foot" },
        PE_h(pg, { e: ev, now }),
        PE_h(mg, { e: ev }),
        PE_h("a", { href: "#e-" + ev.id, className: "gc-textbtn", onClick: (e) => { e.preventDefault(); onClose(); onOpen(ev.id); } }, "Event page")
      )
    )
  );
}

/* ---------- Week grid ---------- */
function PE_layoutDay(items) {
  // items: [{ev, s, e}] sorted by s. Assign lanes within overlap clusters.
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    for (const it of cluster) {
      let l = lanes.findIndex((end) => end <= it.s);
      if (l === -1) { l = lanes.length; lanes.push(it.e); } else lanes[l] = it.e;
      it.lane = l;
    }
    for (const it of cluster) { it.lanes = lanes.length; out.push(it); }
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.s >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  if (cluster.length) flush();
  return out;
}
function PE_WeekGrid({ list, days, now, todayKey, onPick }) {
  const items = list.map((ev) => {
    const { start, end } = je(ev, now);
    const s = PE_minutes(start);
    let e = end ? (Ae(end) === Ae(start) ? PE_minutes(end) : 24 * 60) : s + 60;
    if (e <= s) e = s + 30;
    return { ev, key: Ae(start), s, e: Math.min(e, 24 * 60), noEnd: !end };
  });
  let lo = 8, hi = 20;
  for (const it of items) { lo = Math.min(lo, Math.floor(it.s / 60)); hi = Math.max(hi, Math.ceil(it.e / 60)); }
  lo = Math.max(0, lo); hi = Math.min(24, Math.max(hi, lo + 1));
  const hours = [];
  for (let hr = lo; hr < hi; hr++) hours.push(hr);
  const height = (hi - lo) * PE_HOURPX;
  const hourLabel = (hr) => (hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`);
  const nowMin = PE_minutes(now);
  return PE_h(
    "div",
    { className: "gc-week-scroll" },
    PE_h(
      "div",
      { className: "gc-week" },
      PE_h(
        "div",
        { className: "gc-week-head" },
        PE_h("div", { className: "gc-gutter-head", "aria-hidden": true }, "EST/EDT"),
        days.map((d) =>
          PE_h(
            "div",
            { key: d.key, className: "gc-colhead" + (d.key === todayKey ? " gc-today" : "") + (d.key < todayKey ? " gc-past" : "") },
            PE_h("span", { className: "gc-colhead-wk" }, d.wk),
            PE_h("span", { className: "gc-colhead-num" }, d.num),
            PE_h("span", { className: "gc-sr" }, d.long)
          )
        )
      ),
      PE_h(
        "div",
        { className: "gc-week-body", style: { height } },
        PE_h("div", { className: "gc-gutter", "aria-hidden": true }, hours.map((hr, i) => PE_h("span", { key: hr, className: "gc-hour", style: { top: i * PE_HOURPX } }, i === 0 ? "" : hourLabel(hr)))),
        days.map((d) => {
          const dayItems = PE_layoutDay(items.filter((it) => it.key === d.key).sort((a, b) => a.s - b.s || b.e - a.e));
          return PE_h(
            "div",
            { key: d.key, className: "gc-col" + (d.key < todayKey ? " gc-past" : ""), role: "group", "aria-label": d.long },
            hours.map((hr, i) => PE_h("span", { key: hr, className: "gc-hline", style: { top: i * PE_HOURPX }, "aria-hidden": true })),
            d.key === todayKey && nowMin >= lo * 60 && nowMin <= hi * 60
              ? PE_h("span", { className: "gc-now", style: { top: ((nowMin - lo * 60) / 60) * PE_HOURPX }, "aria-hidden": true })
              : null,
            dayItems.map((it) => {
              const top = ((it.s - lo * 60) / 60) * PE_HOURPX;
              const h = Math.max(22, ((it.e - it.s) / 60) * PE_HOURPX - 2);
              const w = 100 / it.lanes;
              const ev = it.ev;
              const reg = Bo(ev, now);
              const label = `${ev.title}. ${d.long}, ${PE_timeText(ev, now)}${it.noEnd ? " (end time not listed)" : ""}. ${Wo(ev)} ${ev.online ? "Online" : ev.location || ""}`;
              return PE_h(
                "button",
                {
                  key: ev.id,
                  type: "button",
                  "data-testid": "block",
                  className: "gc-block" + (it.noEnd ? " gc-noend" : "") + (h < 44 ? " gc-short" : h < 80 ? " gc-mid" : ""),
                  style: { top, height: h, left: `calc(${it.lane * w}% + 1px)`, width: `calc(${w}% - 3px)`, "--c": PE_color(ev) },
                  "aria-label": label,
                  title: label,
                  onClick: (e) => onPick(ev, e.currentTarget),
                },
                PE_h("span", { className: "gc-block-title" }, ev.title),
                PE_h("span", { className: "gc-block-time" }, PE_timeText(ev, now)),
                PE_h("span", { className: "gc-block-meta" }, Wo(ev)),
                reg.closingSoon ? PE_h("span", { className: "gc-block-alert" }, "RSVP closes soon") : null,
                PE_h("span", { className: "gc-block-meta" }, ev.online ? "Online" : ev.location || "")
              );
            })
          );
        })
      )
    )
  );
}

/* ---------- Schedule list ---------- */
function PE_Schedule({ groups, now, todayKey, onOpen }) {
  return PE_h(
    "ol",
    { className: "gc-sched" },
    groups.map((g) => {
      const d = PE_dayInfo(g.key);
      return PE_h(
        "li",
        { key: g.key, className: "gc-sched-day" },
        PE_h("h3", { className: "gc-sr" }, d.long),
        PE_h(
          "div",
          { className: "gc-sched-date" + (g.key === todayKey ? " gc-today" : ""), "aria-hidden": true },
          PE_h("span", { className: "gc-sched-num" }, d.num),
          PE_h("span", { className: "gc-sched-wk" }, `${d.wk}, ${d.mon}`)
        ),
        PE_h(
          "ul",
          { className: "gc-sched-list" },
          g.events.map((ev) =>
            PE_h(
              "li",
              { key: ev.id },
              PE_h(
                "a",
                {
                  href: "#e-" + ev.id,
                  "data-testid": "card",
                  className: "gc-row",
                  onClick: (e) => { e.preventDefault(); onOpen(ev.id); },
                },
                PE_h("span", { className: "gc-row-title" }, ev.title),
                PE_h("span", { className: "gc-row-dot", style: { background: PE_color(ev) }, "aria-hidden": true }),
                PE_h(
                  "span",
                  { className: "gc-row-time" },
                  PE_timeText(ev, now),
                  je(ev, now).end ? null : PE_h("span", { className: "gc-sr" }, " (end time not listed)")
                ),
                PE_h("div", { className: "gc-row-body" },
                  PE_h(Ws, { e: ev, compact: !0 }),
                  PE_h("p", { className: "gc-row-org" }, ev.organizer),
                  PE_h("p", { className: "gc-row-loc" }, PE_h(PE_Icon, { name: "pin", size: 14 }), ev.online ? "Online" : ev.location || "Location not announced"),
                  PE_h(Gd, { e: ev, now }),
                  PE_h(Zd, { e: ev, now }),
                  PE_h(PE_Cats, { e: ev })
                )
              )
            )
          )
        )
      );
    })
  );
}

function PE_Cats({ e }) {
  return PE_h(
    "div",
    { className: "gc-cats" },
    e.categories.map((c) => PE_h("span", { key: c, className: "gc-cat", style: { "--c": PE_CAT[c] || PE_CAT.other } }, PE_h("i", { "aria-hidden": true }), Ql[c] || c))
  );
}

/* ---------- Events with no announced date ---------- */
function PE_Undated({ list, now, onOpen }) {
  if (!list.length) return null;
  return PE_h(
    "section",
    { className: "gc-tbd", "aria-labelledby": "gc-tbd-h" },
    PE_h("h3", { id: "gc-tbd-h", className: "gc-tbd-h" }, `Date to be announced (${list.length})`),
    PE_h("p", { className: "gc-tbd-note" }, "The organizer has not announced a date or time yet. Check the event page or the organizer for updates."),
    PE_h(
      "ul",
      { className: "gc-sched-list gc-tbd-list" },
      list.map((ev) =>
        PE_h(
          "li",
          { key: ev.id },
          PE_h(
            "a",
            { href: "#e-" + ev.id, "data-testid": "card-tbd", className: "gc-row", onClick: (e) => { e.preventDefault(); onOpen(ev.id); } },
            PE_h("span", { className: "gc-row-title" }, ev.title),
            PE_h("span", { className: "gc-row-dot", style: { background: PE_color(ev) }, "aria-hidden": true }),
            PE_h("span", { className: "gc-row-time" }, "Date to be announced"),
            PE_h("div", { className: "gc-row-body" },
              PE_h(Ws, { e: ev, compact: !0 }),
              PE_h("p", { className: "gc-row-org" }, ev.organizer),
              PE_h("p", { className: "gc-row-loc" }, PE_h(PE_Icon, { name: "pin", size: 14 }), ev.online ? "Online" : ev.location || "Location to be announced"),
              PE_h(Gd, { e: ev, now }),
              PE_h(PE_Cats, { e: ev })
            )
          )
        )
      )
    )
  );
}

/* ---------- Finder ---------- */
function PE_Finder({ events: allEvents, now, loadState, note, onOpen }) {
  const [f, setF] = E.useState(PE_loadFilters);
  const [view, setView] = E.useState(() => f.view || "schedule");
  const [pop, setPop] = E.useState(null);
  E.useEffect(() => {
    an.set(PE_FKEY, JSON.stringify({ ...f, view: f.view }));
  }, [f]);
  const list = E.useMemo(() => Ih(allEvents, f, now), [allEvents, f, now]);
  const groups = E.useMemo(() => Mh(list, now), [list, now]);
  const tbd = E.useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return allEvents
      .filter((ev) => ev.status === "scheduled" && !je(ev, now).start)
      .filter((ev) => Oh(ev, f.year))
      .filter((ev) => f.interests.length === 0 || ev.categories.some((c) => f.interests.includes(c)))
      .filter((ev) => !q || ev.title.toLowerCase().includes(q) || ev.organizer.toLowerCase().includes(q))
      .sort((x, y) => x.title.localeCompare(y.title));
  }, [allEvents, f.year, f.interests, f.q, now]);
  const range = Bd(now, f.week);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => PE_dayInfo(Us(range.start, i)));
  const todayKey = Ae(now);
  const eventDays = E.useMemo(() => {
    const s = new Set();
    for (let w = 0; w <= PE_MAXWEEK; w++) for (const ev of Ih(allEvents, { ...f, week: w }, now)) s.add(Ae(je(ev, now).start));
    return s;
  }, [allEvents, f.year, f.interests, f.q, now]);
  const describe = [
    f.week === 0 ? "this week" : f.week === 1 ? "next week" : `the week of ${PE_fmtMonthDay.format(PE_keyUTC(range.start))}`,
    f.year !== "all" ? `${PE_YEARS[f.year].toLowerCase()} eligibility` : null,
    f.interests.length ? f.interests.map((v) => Ql[v]).join(", ") : null,
    f.q ? `search "${f.q}"` : null,
  ].filter(Boolean).join(" · ");
  E.useEffect(() => {
    if (loadState !== "loading" && list.length === 0) {
      const v = `week=${f.week};year=${f.year};interests=${f.interests.join("+") || "any"};q=${f.q ? "yes" : "no"}`;
      Ut("empty_result", { detail: v, oncePerSession: `empty:${v}` });
    }
  }, [list.length, f, loadState]);
  const upd = (patch, detail) => { setF((p) => ({ ...p, ...patch })); detail && Ut("filter_change", { detail }); };
  const setWeek = (w) => { const v = Math.max(0, Math.min(PE_MAXWEEK, w)); upd({ week: v }, `week=${v}`); };
  const toggleInterest = (v) => {
    const on = !f.interests.includes(v);
    upd({ interests: on ? [...f.interests, v] : f.interests.filter((x) => x !== v) }, `interest=${v}:${on ? "on" : "off"}`);
  };
  const isDefault = f.week === 0 && f.year === "all" && f.interests.length === 0 && !f.q;
  const pick = (ev, el) => { if (PE_wide()) setPop({ ev, el }); else onOpen(ev.id); };
  const closePop = E.useCallback(() => {
    setPop((p) => { if (p && p.el && document.contains(p.el)) setTimeout(() => p.el.focus(), 0); return null; });
  }, []);
  const seg = (label, name, value, options, onChange) =>
    PE_h(
      "div",
      { role: "radiogroup", "aria-label": label, className: "gc-seg" },
      options.map(([v, text]) =>
        PE_h("button", { key: String(v), type: "button", role: "radio", "aria-checked": value === v, name, className: "gc-seg-btn", onClick: () => onChange(v) }, text)
      )
    );
  const rangeText = `${PE_fmtMonthDay.format(PE_keyUTC(range.start))} to ${PE_fmtMonthDay.format(PE_keyUTC(range.end))}`;
  const empty =
    loadState !== "loading" && list.length === 0 && tbd.length === 0
      ? PE_h(
          "div",
          { className: "gc-empty", "data-testid": "empty", role: "status" },
          PE_h("p", { className: "gc-empty-title" }, `No events match ${describe}.`),
          f.year !== "all"
            ? PE_h("p", { className: "gc-empty-note" }, `Events for ${PE_YEAR_PLURAL[f.year]} are shown. Events that don't state eligibility count as open to all.`)
            : null,
          PE_h(
            "div",
            { className: "gc-empty-actions" },
            f.week < PE_MAXWEEK ? PE_h("button", { type: "button", className: "gc-pill", onClick: () => setWeek(f.week + 1) }, "See next week") : null,
            f.interests.length ? PE_h("button", { type: "button", className: "gc-pill", onClick: () => upd({ interests: [] }, "clear-interests") }, "Clear interest filters") : null,
            f.q ? PE_h("button", { type: "button", className: "gc-pill", onClick: () => upd({ q: "" }, "clear-search") }, "Clear search") : null
          )
        )
      : null;

  return PE_h(
    "div",
    { className: "gc-app" },
    PE_h(
      "aside",
      { className: "gc-side", "aria-labelledby": "filters-h" },
      PE_h("h2", { id: "filters-h", className: "gc-sr" }, "Filters"),
      PE_h(
        "div",
        { className: "gc-side-sec gc-side-year" },
        PE_h("p", { className: "gc-side-h", "aria-hidden": true }, "Class year"),
        seg("Class year", "year", f.year, [["all", "All"], ["first-year", "First-year"], ["sophomore", "Sophomore"]], (v) => upd({ year: v }, `year=${v}`))
      ),
      PE_h(
        "div",
        { className: "gc-side-sec" },
        PE_h("p", { className: "gc-side-h", id: "gc-int-h" }, "Interests", PE_h("span", { className: "gc-side-hint" }, f.interests.length ? "" : " · showing all")),
        PE_h(
          "div",
          { role: "group", "aria-labelledby": "gc-int-h", className: "gc-cals" },
          pi.map((v) =>
            PE_h(
              "button",
              { key: v, type: "button", "aria-pressed": f.interests.includes(v), className: "gc-cal", style: { "--c": PE_CAT[v] }, onClick: () => toggleInterest(v) },
              PE_h("span", { className: "gc-cal-box", "aria-hidden": true }, f.interests.includes(v) ? PE_h(PE_Icon, { name: "check", size: 14 }) : null),
              Ql[v]
            )
          )
        )
      ),
      PE_h(
        "div",
        { className: "gc-side-sec gc-searchrow" },
        PE_h("label", { htmlFor: "q", className: "gc-sr" }, "Search by title or organizer"),
        PE_h("input", { id: "q", type: "search", className: "gc-search", placeholder: "Search events", value: f.q, maxLength: 80, onChange: (e) => setF((p) => ({ ...p, q: e.target.value })) }),
        PE_h("button", { type: "button", className: "gc-textbtn", "aria-label": "Reset all filters", disabled: isDefault, onClick: () => { setF((p) => ({ week: 0, year: "all", interests: [], q: "", view: p.view })); Ut("filter_change", { detail: "reset" }); } }, "Reset")
      )
    ),
    PE_h(
      "section",
      { className: "gc-main", "aria-label": "Events" },
      PE_h(
        "div",
        { className: "gc-toolbar" },
        seg("Week", "week", f.week, [[0, "This week"], [1, "Next week"]], setWeek),
        PE_h(
          "div",
          { className: "gc-nav" },
          PE_h("button", { type: "button", className: "gc-iconbtn", "aria-label": "Previous week", disabled: f.week === 0, onClick: () => setWeek(f.week - 1) }, PE_h(PE_Icon, { name: "left" })),
          PE_h("button", { type: "button", className: "gc-iconbtn", "aria-label": "Following week", disabled: f.week >= PE_MAXWEEK, onClick: () => setWeek(f.week + 1) }, PE_h(PE_Icon, { name: "right" }))
        ),
        PE_h("h2", { className: "gc-title" }, PE_title(range.start, range.end)),
        PE_h(
          "div",
          { className: "gc-viewsel" },
          PE_h("label", { htmlFor: "gc-view", className: "gc-sr" }, "View"),
          PE_h(
            "select",
            { id: "gc-view", value: view, onChange: (e) => { const v = e.target.value; setView(v); setF((p) => ({ ...p, view: v })); Ut("filter_change", { detail: `view=${v}` }); } },
            PE_h("option", { value: "week" }, "Week"),
            PE_h("option", { value: "schedule" }, "Schedule")
          )
        )
      ),
      PE_h(
        "p",
        { className: "gc-range", "aria-live": "polite" },
        PE_h("span", null, rangeText),
        PE_h("span", null, loadState === "loading" && list.length === 0 ? "Loading events…" : `${list.length} event${list.length === 1 ? "" : "s"}`)
      ),
      note ? PE_h("p", { className: "gc-note", role: "status" }, note) : null,
      empty,
      view === "week"
        ? PE_h(PE_WeekGrid, { list, days, now, todayKey, onPick: pick })
        : list.length
          ? PE_h(PE_Schedule, { groups, now, todayKey, onOpen })
          : null,
      PE_h(PE_Undated, { list: tbd, now, onOpen }),
      pop ? PE_h(PE_Popover, { ev: pop.ev, now, anchor: pop.el, onClose: closePop, onOpen }) : null
    )
  );
}
function Lg(props) {
  return PE_h(PE_Finder, props);
}
