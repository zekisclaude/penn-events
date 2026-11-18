function dn(e) {
  return (
    Hi.has(e) ||
      Hi.set(
        e,
        (async () => {
          const t = await fh();
          if (!t) return null;
          try {
            return await Promise.race([
              t.use(e),
              new Promise((n) => setTimeout(() => n(null), 1e4)),
            ]);
          } catch {
            return null;
          }
        })(),
      ),
    Hi.get(e)
  );
}
async function Fo() {
  const e = await dn("user");
  if (!e) return { isAdmin: !1, isOwner: !1, known: !1 };
  try {
    const [t, n] = await Promise.all([e.isOwner(), e.canEdit()]);
    return { isAdmin: !!n || !!t, isOwner: !!t, known: !0 };
  } catch {
    return { isAdmin: !1, isOwner: !1, known: !1 };
  }
}
function Vo(e = "") {
  const t = new Uint8Array(10);
  return (
    crypto.getRandomValues(t),
    e +
      Array.from(t, (n) => n.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 16)
  );
}
async function sr(e) {
  const t =
      typeof e == "string" ? new TextEncoder().encode(e) : new Uint8Array(e),
    n = await crypto.subtle.digest("SHA-256", t);
  return Array.from(new Uint8Array(n), (r) => r.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}
const an = {
  get(e) {
    try {
      return localStorage.getItem(e);
    } catch {
      return null;
    }
  },
  set(e, t) {
    try {
      localStorage.setItem(e, t);
    } catch {}
  },
};
function Me(e) {
  return JSON.parse(JSON.stringify(e));
}
const ph = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        getViewer: Fo,
        ls: an,
        plain: Me,
        randomId: Vo,
        sha256: sr,
        useCapability: dn,
      },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  ),
  Ur = "America/New_York",
  mh = new Intl.DateTimeFormat("en-US", {
    timeZone: Ur,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }),
  hh = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function Fr(e) {
  const t = {};
  for (const n of mh.formatToParts(e)) t[n.type] = n.value;
  return {
    year: +t.year,
    month: +t.month,
    day: +t.day,
    hour: +t.hour % 24,
    minute: +t.minute,
    second: +t.second,
    weekday: hh[t.weekday] ?? 1,
  };
}
const it = (e) => String(e).padStart(2, "0");
function Ae(e) {
  const t = Fr(e);
  return `${t.year}-${it(t.month)}-${it(t.day)}`;
}
function Us(e, t) {
  const [n, r, l] = e.split("-").map(Number),
    i = new Date(Date.UTC(n, r - 1, l + t));
  return `${i.getUTCFullYear()}-${it(i.getUTCMonth() + 1)}-${it(i.getUTCDate())}`;
}
function cu(e) {
  const t = Fr(new Date(e));
  return (
    Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) -
    Math.floor(e / 1e3) * 1e3
  );
}
function Ho(e, t, n, r, l) {
  const i = Date.UTC(e, t - 1, n, r, l);
  let s = i - cu(i);
  const a = i - cu(s);
  return a !== s && (s = a), new Date(s);
}
function kl(e) {
  if (!e) return null;
  const t = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(e.trim());
  if (!t) return null;
  const [n, r, l, i, s] = t.slice(1).map(Number);
  if (r < 1 || r > 12 || l < 1 || l > 31 || i > 23 || s > 59) return null;
  const a = Ho(n, r, l, i, s),
    u = Fr(a);
  return u.year !== n || u.month !== r || u.day !== l ? null : a;
}
function gh(e) {
  if (!e) return "";
  const t = new Date(e);
  if (isNaN(t.getTime())) return "";
  const n = Fr(t);
  return `${n.year}-${it(n.month)}-${it(n.day)}T${it(n.hour)}:${it(n.minute)}`;
}
function Bd(e, t) {
  const n = Fr(e),
    r = `${n.year}-${it(n.month)}-${it(n.day)}`,
    l = Us(r, -(n.weekday - 1) + t * 7);
  return { start: l, end: Us(l, 6) };
}
const vh = new Intl.DateTimeFormat("en-US", {
    timeZone: Ur,
    weekday: "long",
    month: "long",
    day: "numeric",
  }),
  yh = new Intl.DateTimeFormat("en-US", {
    timeZone: Ur,
    weekday: "short",
    month: "short",
    day: "numeric",
  }),
  xh = new Intl.DateTimeFormat("en-US", {
    timeZone: Ur,
    hour: "numeric",
    minute: "2-digit",
  }),
  wh = new Intl.DateTimeFormat("en-US", {
    timeZone: Ur,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
  kh = (e) => vh.format(e),
  Oe = (e) => yh.format(e),
  ke = (e) => xh.format(e).replace(":00", "").replace(" ", " "),
  Yd = (e) => wh.format(e);
function Wi(e) {
  const [t, n, r] = e.split("-").map(Number);
  return kh(Ho(t, n, r, 12, 0));
}
function Sh(e, t) {
  return t
    ? Ae(e) !== Ae(t)
      ? `${ke(e)} to ${Oe(t)}, ${ke(t)}`
      : `${ke(e)} to ${ke(t)}`
    : ke(e);
}
function jh(e) {
  const t = Math.round(e / 36e5);
  return t < 1
    ? "within the hour"
    : t < 48
      ? `in ${t} hour${t === 1 ? "" : "s"}`
      : `in ${Math.round(t / 24)} days`;
}
function Nh() {
  let e = an.get("pe.device");
  return e || ((e = Vo("d")), an.set("pe.device", e)), e;
}
const du = new Set();
async function Ut(e, t = {}) {
  try {
    if (t.oncePerSession) {
      if (du.has(t.oncePerSession)) return;
      du.add(t.oncePerSession);
    }
    const n = await dn("db");
    if (!n) return;
    const r = await Fo(),
      l = new Date(),
      i = {
        type: e,
        eventId: t.eventId ?? null,
        isDemoEvent: !!t.isDemoEvent,
        detail: t.detail ?? null,
        device: Nh(),
        day: Ae(l),
        at: l.toISOString(),
        admin: r.isAdmin,
      };
    await n.collection("metrics").doc(Vo("m")).set(i);
  } catch {}
}
function Ch() {
  const e = Ae(new Date());
  an.get("pe.lastVisitDay") !== e &&
    (an.set("pe.lastVisitDay", e), Ut("visit"));
}
const bh = "modulepreload",
  Eh = function (e, t) {
    return new URL(e, t).href;
  },
  fu = {},
  _h = function (t, n, r) {
    let l = Promise.resolve();
    if (n && n.length > 0) {
      const s = document.getElementsByTagName("link"),
        a = document.querySelector("meta[property=csp-nonce]"),
        u = a?.nonce || a?.getAttribute("nonce");
      l = Promise.allSettled(
        n.map((c) => {
          if (((c = Eh(c, r)), c in fu)) return;
          fu[c] = !0;
          const d = c.endsWith(".css"),
            h = d ? '[rel="stylesheet"]' : "";
          if (!!r)
            for (let w = s.length - 1; w >= 0; w--) {
              const v = s[w];
              if (v.href === c && (!d || v.rel === "stylesheet")) return;
            }
          else if (document.querySelector(`link[href="${c}"]${h}`)) return;
          const y = document.createElement("link");
          if (
            ((y.rel = d ? "stylesheet" : bh),
            d || (y.as = "script"),
            (y.crossOrigin = ""),
            (y.href = c),
            u && y.setAttribute("nonce", u),
            document.head.appendChild(y),
            d)
          )
            return new Promise((w, v) => {
              y.addEventListener("load", w),
                y.addEventListener("error", () =>
                  v(new Error(`Unable to preload CSS for ${c}`)),
                );
            });
        }),
      );
    }
    function i(s) {
      const a = new Event("vite:preloadError", { cancelable: !0 });
      if (((a.payload = s), window.dispatchEvent(a), !a.defaultPrevented))
        throw s;
    }
    return l.then((s) => {
      for (const a of s || []) a.status === "rejected" && i(a.reason);
      return t().catch(i);
    });
  },
  Ph = "2026-11-12T21:38:07.533Z",
  zh = [
    {
      id: "demo-resume-review-night",
      title: "Resume Review Night",
      organizer: "Demo Career Collective",
      description:
        "Peer reviewers mark up one-page resumes for internship applications. Bring a printed copy or a PDF.",
      categories: ["finance", "consulting"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Hall 120",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "required",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 5,
        time: "18:00",
        durationMin: 90,
        deadlineHours: 72,
      },
    },
    {
      id: "demo-first-year-coffee-chats",
      title: "First-Year Coffee Chats",
      organizer: "Demo Finance Society",
      description:
        "Small-group conversations with upperclassmen about finance recruiting timelines.",
      categories: ["finance"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Cafe, 2nd floor",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "optional",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 1,
        time: "16:00",
        durationMin: 60,
        deadlineHours: null,
      },
    },
    {
      id: "demo-sophomore-case-workshop",
      title: "Sophomore Case Interview Workshop",
      organizer: "Demo Consulting Group",
      description:
        "A live case walkthrough followed by paired practice. Seats are limited.",
      categories: ["consulting"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Hall 245",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["sophomore"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "required",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 2,
        time: "13:00",
        durationMin: 120,
        deadlineHours: 30,
      },
    },
    {
      id: "demo-wharton-underclass-panel",
      title: "Underclass Recruiting Panel",
      organizer: "Demo Wharton Society",
      description:
        "Juniors describe how they found sophomore-year programs. Walk in any time.",
      categories: ["finance"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Forum",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: "Wharton",
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "none",
      registrationStatus: "unknown",
      rsvpUrl: null,
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 3,
        time: "12:00",
        durationMin: null,
        deadlineHours: null,
      },
    },
    {
      id: "demo-members-trading-sim",
      title: "Trading Simulation Night",
      organizer: "Demo Investing Club",
      description:
        "Teams trade a simulated market. Open to the club's general body members who submit the short application.",
      categories: ["finance"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Lab B",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: "General body members",
        application: !0,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "required",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 8,
        time: "19:00",
        durationMin: 120,
        deadlineHours: 96,
      },
    },
    {
      id: "demo-cultural-night",
      title: "Fall Cultural Night",
      organizer: "Demo Cultural Association",
      description:
        "Food, music and performances. The announcement did not say who may attend.",
      categories: ["culture"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Ballroom",
      online: !1,
      onlineUrl: null,
      eligibleYears: [],
      eligibilityStatus: "unconfirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "unconfirmed",
      registrationStatus: "unknown",
      rsvpUrl: null,
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 1,
        time: "19:00",
        durationMin: 180,
        deadlineHours: null,
      },
    },
    {
      id: "demo-tech-info-session",
      title: "Software Internship Info Session",
      organizer: "Demo Tech Collective",
      description:
        "An engineer explains the summer internship and the interview process.",
      categories: ["tech"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Engineering 101",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility:
        "The internship is for rising juniors and seniors. The info session itself is open to all undergraduates.",
      registration: "required",
      registrationStatus: "closed",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 4,
        time: "17:00",
        durationMin: 60,
        deadlineHours: null,
      },
    },
    {
      id: "demo-open-mic",
      title: "Late Open Mic",
      organizer: "Demo Arts Collective",
      description:
        "Sign up at the door or just listen. No end time was announced.",
      categories: ["culture"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Coffeehouse",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "none",
      registrationStatus: "unknown",
      rsvpUrl: null,
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 0,
        time: "21:00",
        durationMin: null,
        deadlineHours: null,
      },
    },
    {
      id: "demo-canceled-mixer",
      title: "Consulting Mixer",
      organizer: "Demo Consulting Group",
      description: "Informal networking with alumni.",
      categories: ["consulting"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Lounge",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "required",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "canceled",
      statusNote: "The organizer canceled because of a scheduling conflict.",
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 2,
        time: "18:30",
        durationMin: 90,
        deadlineHours: 24,
      },
    },
    {
      id: "demo-postponed-hackathon",
      title: "Weekend Build Sprint",
      organizer: "Demo Tech Collective",
      description: "A 24-hour build sprint for beginners.",
      categories: ["tech"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Engineering Atrium",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "required",
      registrationStatus: "open",
      rsvpUrl: "https://example.com/penn-events-demo-rsvp",
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "postponed",
      statusNote: "Postponed. A new date has not been announced.",
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: 6,
        time: "10:00",
        durationMin: null,
        deadlineHours: null,
      },
    },
    {
      id: "demo-past-speaker",
      title: "Alumni Speaker: First Year on the Desk",
      organizer: "Demo Finance Society",
      description: "An alumnus describes the first year as a markets analyst.",
      categories: ["finance"],
      start: null,
      end: null,
      timezone: "America/New_York",
      location: "Demo Auditorium",
      online: !1,
      onlineUrl: null,
      eligibleYears: ["first-year", "sophomore", "junior", "senior"],
      eligibilityStatus: "confirmed",
      restrictions: {
        school: null,
        membership: null,
        application: !1,
        invitationOnly: !1,
        other: null,
      },
      jobEligibility: null,
      registration: "none",
      registrationStatus: "unknown",
      rsvpUrl: null,
      rsvpDeadline: null,
      rsvpInstructions: null,
      status: "scheduled",
      statusNote: null,
      announcementUrl: null,
      sourceLabel: "Demo fixture (not a real announcement)",
      lastVerified: "2026-11-12T21:33:24.027Z",
      created: "2026-11-12T21:33:24.027Z",
      updated: "2026-11-12T21:33:24.027Z",
      imageRef: null,
      isDemo: !0,
      demoAnchor: {
        dayOffset: -3,
        time: "18:00",
        durationMin: 60,
        deadlineHours: null,
      },
    },
  ],
  Th = { generatedAt: Ph, events: zh },
  Yl = ["first-year", "sophomore", "junior", "senior"],
  pi = ["finance", "consulting", "tech", "culture", "other"],
  Ql = {
    finance: "Finance",
    consulting: "Consulting",
    tech: "Tech",
    culture: "Culture",
    other: "Other",
  };
function Dh() {
  return {
    school: null,
    membership: null,
    application: !1,
    invitationOnly: !1,
    other: null,
  };
}
function Lh(e, t) {
  return {
    id: e,
    title: "",
    organizer: "",
    description: "",
    categories: [],
    start: null,
    end: null,
    timezone: "America/New_York",
    location: null,
    online: !1,
    onlineUrl: null,
    eligibleYears: [],
    eligibilityStatus: "unconfirmed",
    restrictions: Dh(),
    jobEligibility: null,
    registration: "unconfirmed",
    registrationStatus: "unknown",
    rsvpUrl: null,
    rsvpDeadline: null,
    rsvpInstructions: null,
    status: "scheduled",
    statusNote: null,
    announcementUrl: null,
    sourceLabel: "",
    lastVerified: t,
    created: t,
    updated: t,
    imageRef: null,
    isDemo: !1,
    demoAnchor: null,
  };
}
function je(e, t) {
  if (e.isDemo && e.demoAnchor) {
    const r = e.demoAnchor,
      l = Us(Ae(t), r.dayOffset),
      [i, s, a] = l.split("-").map(Number),
      [u, c] = r.time.split(":").map(Number),
      d = Ho(i, s, a, u, c),
      h = r.durationMin ? new Date(d.getTime() + r.durationMin * 6e4) : null,
      m =
        r.deadlineHours != null
          ? new Date(t.getTime() + r.deadlineHours * 36e5)
          : null;
    return { start: d, end: h, deadline: m };
  }
  const n = (r) => {
    if (!r) return null;
    const l = new Date(r);
    return isNaN(l.getTime()) ? null : l;
  };
  return { start: n(e.start), end: n(e.end), deadline: n(e.rsvpDeadline) };
}
function mi(e, t) {
  const n = je(e, t);
  return n.start
    ? n.end
      ? t.getTime() >= n.end.getTime()
      : Ae(t) > Ae(n.start)
    : !1;
}
function Rh(e, t) {
  return e.status !== "scheduled" || !je(e, t).start ? !1 : !mi(e, t);
}
const Fs = { week: 0, year: "all", interests: [], q: "" };
function Oh(e, t) {
  return t === "all"
    ? !0
    : e.eligibilityStatus === "confirmed" && e.eligibleYears.includes(t);
}
function Ih(e, t, n) {
  const { start: r, end: l } = Bd(n, t.week),
    i = t.q.trim().toLowerCase();
  return e
    .filter((s) => Rh(s, n))
    .filter((s) => {
      const a = Ae(je(s, n).start);
      return a >= r && a <= l;
    })
    .filter((s) => Oh(s, t.year))
    .filter(
      (s) =>
        t.interests.length === 0 ||
        s.categories.some((a) => t.interests.includes(a)),
    )
    .filter(
      (s) =>
        !i ||
        s.title.toLowerCase().includes(i) ||
        s.organizer.toLowerCase().includes(i),
    )
    .sort((s, a) => je(s, n).start.getTime() - je(a, n).start.getTime());
}
function Mh(e, t) {
  const n = [];
  for (const r of e) {
    const l = Ae(je(r, t).start),
      i = n[n.length - 1];
    i && i.key === l ? i.events.push(r) : n.push({ key: l, events: [r] });
  }
  return n;
}
const Ah = {
  "first-year": "first-years",
  sophomore: "sophomores",
  junior: "juniors",
  senior: "seniors",
};
function $h(e) {
  return e.length <= 1
    ? e.join("")
    : e.length === 2
      ? `${e[0]} and ${e[1]}`
      : `${e.slice(0, -1).join(", ")}, and ${e[e.length - 1]}`;
}
const pu = (e) => e.charAt(0).toUpperCase() + e.slice(1);
function Wo(e) {
  if (e.eligibilityStatus !== "confirmed" || e.eligibleYears.length === 0)
    return "Eligibility not confirmed.";
  const t = Yl.every((l) => e.eligibleYears.includes(l)),
    n = $h(Yl.filter((l) => e.eligibleYears.includes(l)).map((l) => Ah[l])),
    r = e.restrictions.school?.trim();
  return e.restrictions.membership
    ? t
      ? "Members only."
      : `Members only. ${pu(n)}.`
    : r
      ? t
        ? `${r} undergraduates only.`
        : `${r} ${n} only.`
      : t
        ? "Open to all Penn undergraduates."
        : `${pu(n)} only.`;
}
function Uh(e) {
  const t = e.restrictions,
    n = [];
  return (
    t.school && n.push(`${t.school} students only`),
    t.membership && n.push(`Membership: ${t.membership}`),
    t.application && n.push("Application required"),
    t.invitationOnly && n.push("Invitation only"),
    t.other && n.push(t.other),
    n
  );
}
function Bo(e, t) {
  const r = je(e, t).deadline,
    l = r ? t.getTime() > r.getTime() : !1;
  let i;
  e.registration === "none"
    ? (i = "none")
    : e.registrationStatus === "closed" || l
      ? (i = "closed")
      : e.registration === "unconfirmed"
        ? (i = "unconfirmed")
        : (i = e.registration);
  const s = {
      required: "Registration required",
      optional: "Registration optional",
      none: "No registration required",
      closed: "RSVP closed",
      unconfirmed: "Registration details unconfirmed",
    },
    a =
      !!r &&
      !l &&
      i !== "closed" &&
      i !== "none" &&
      r.getTime() - t.getTime() <= 48 * 36e5,
    u =
      !!e.rsvpUrl &&
      tn(e.rsvpUrl) &&
      i !== "closed" &&
      i !== "none" &&
      e.status === "scheduled" &&
      !mi(e, t);
  return {
    state: i,
    label: s[i],
    closingSoon: a,
    deadline: r,
    canRsvp: u,
    deadlineUnknown: !r,
  };
}
function tn(e) {
  if (!e) return !1;
  try {
    const t = new URL(e);
    return (
      (t.protocol === "https:" || t.protocol === "http:") &&
      !!t.hostname &&
      t.hostname.includes(".")
    );
  } catch {
    return !1;
  }
}
function Vs(e) {
  return tn(e) ? new URL(e).toString() : void 0;
}
function Kl(e) {
  return e
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function Zl(e, t = 48) {
  const n = Kl(e).replace(/ /g, "-");
  if (n.length <= t) return n || "event";
  const r = n.slice(0, t + 1),
    l = r.lastIndexOf("-");
  return (l > 8 ? r.slice(0, l) : n.slice(0, t)).replace(/-+$/g, "") || "event";
}
function Rr(e) {
  const t = e.start ? Ae(new Date(e.start)) : "nodate";
  return `${Zl(e.organizer, 30)}|${t}|${Zl(e.title, 40)}`;
}
function mu(e) {
  return new Set(
    Kl(e)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}
function Fh(e, t) {
  const n = mu(e),
    r = mu(t);
  if (!n.size || !r.size) return 0;
  let l = 0;
  return (
    n.forEach((i) => {
      r.has(i) && l++;
    }),
    l / Math.min(n.size, r.size)
  );
}
function Vh(e, t) {
  const n = [],
    r = e.start ? Ae(new Date(e.start)) : null;
  for (const l of t) {
    if (l.id === e.id) continue;
    const i = Kl(l.organizer) === Kl(e.organizer) && !!e.organizer,
      s = l.start ? Ae(new Date(l.start)) : null,
      a = Fh(l.title, e.title);
    if (!!e.rsvpUrl && !!l.rsvpUrl && e.rsvpUrl === l.rsvpUrl)
      n.push({
        id: l.id,
        title: l.title,
        reason: "Same RSVP link",
        strong: !0,
      });
    else if (i && r && r === s && a >= 0.5) {
      const c = l.start === e.start;
      n.push({
        id: l.id,
        title: l.title,
        reason: c
          ? "Same organizer, date, time and similar title"
          : "Same organizer and date, similar title, different time (may be a separate session)",
        strong: c,
      });
    } else
      i &&
        a >= 0.8 &&
        (r !== s || !r) &&
        n.push({
          id: l.id,
          title: l.title,
          reason:
            r && s
              ? "Same organizer and title on a different date (possible reschedule)"
              : "Same organizer and title (possible update or correction)",
          strong: !1,
        });
  }
  return n;
}
const Hh = [
  "title",
  "organizer",
  "description",
  "categories",
  "start",
  "end",
  "location",
  "online",
  "onlineUrl",
  "eligibleYears",
  "eligibilityStatus",
  "restrictions",
  "jobEligibility",
  "registration",
  "registrationStatus",
  "rsvpUrl",
  "rsvpDeadline",
  "rsvpInstructions",
  "status",
  "statusNote",
  "announcementUrl",
];
function Vr(e, t) {
  return Hh.filter((n) => JSON.stringify(e[n]) !== JSON.stringify(t[n]));
}
function Hr(e) {
  const t = [];
  return (
    e.title.trim() || t.push({ text: "Title is missing.", blocking: !0 }),
    e.organizer.trim() ||
      t.push({ text: "Organizer is missing.", blocking: !0 }),
    !e.start &&
      e.status !== "postponed" &&
      t.push({ text: "Start date and time are missing.", blocking: !0 }),
    e.categories.length === 0 &&
      t.push({ text: "Pick at least one category.", blocking: !0 }),
    e.sourceLabel.trim() ||
      t.push({ text: "Public source attribution is missing.", blocking: !0 }),
    e.start &&
      e.end &&
      new Date(e.end) <= new Date(e.start) &&
      t.push({ text: "End time is before the start time.", blocking: !0 }),
    e.eligibilityStatus === "confirmed" &&
      e.eligibleYears.length === 0 &&
      t.push({
        text: "Eligibility is marked confirmed but no class years are selected.",
        blocking: !0,
      }),
    e.eligibilityStatus !== "confirmed" &&
      t.push({
        text: "Eligibility is not confirmed. The event will only appear under All and will be labeled.",
        blocking: !1,
      }),
    !e.location &&
      !e.online &&
      t.push({ text: "Location is missing.", blocking: !1 }),
    e.online &&
      !tn(e.onlineUrl) &&
      e.onlineUrl &&
      t.push({ text: "Online link is not a valid https link.", blocking: !0 }),
    e.rsvpUrl &&
      !tn(e.rsvpUrl) &&
      t.push({ text: "RSVP link is not a valid https link.", blocking: !0 }),
    e.announcementUrl &&
      !tn(e.announcementUrl) &&
      t.push({
        text: "Announcement link is not a valid https link.",
        blocking: !0,
      }),
    e.registration === "required" &&
      !e.rsvpUrl &&
      !e.rsvpInstructions &&
      t.push({
        text: "Registration is required but there is no RSVP link or instructions.",
        blocking: !1,
      }),
    e.registration !== "none" &&
      !e.rsvpDeadline &&
      t.push({ text: "RSVP deadline is not listed.", blocking: !1 }),
    e.rsvpDeadline &&
      e.start &&
      new Date(e.rsvpDeadline) > new Date(e.start) &&
      t.push({
        text: "RSVP deadline is after the event starts.",
        blocking: !1,
      }),
    t
  );
}
const Hs = Th;
function Wh() {
  return { generatedAt: Hs.generatedAt, count: Hs.events.length };
}
function Bh() {
  const [e, t] = E.useState(Hs.events),
    [n, r] = E.useState("loading"),
    [l, i] = E.useState(null);
  return (
    E.useEffect(() => {
      let s = null,
        a = !1;
      const u = setTimeout(() => {
        a ||
          (r("snapshot"),
          i(
            "Live updates are not reachable right now. Showing the last published snapshot.",
          ));
      }, 1e4);
      return (
        dn("db").then((c) => {
          if (!c) {
            (a = !0), clearTimeout(u), r("snapshot"), i(null);
            return;
          }
          s = c.collection("events").onSnapshot(
            (d) => {
              t(d.docs.map((h) => h.data())),
                d.metadata.fromCache ||
                  ((a = !0), clearTimeout(u), r("live"), i(null));
            },
            () => {
              (a = !0),
                clearTimeout(u),
                r("snapshot"),
                i("Live updates stopped. Showing the last published snapshot.");
            },
          );
        }),
        () => {
          clearTimeout(u), s?.();
        }
      );
    }, []),
    { events: e, state: n, note: l }
  );
}
function Gl(e, t) {
  const [n, r] = E.useState([]),
    [l, i] = E.useState(!1),
    [s, a] = E.useState(null);
  return (
    E.useEffect(() => {
      let u = null;
      return (
        dn("db").then((c) => {
          if (!c) {
            a("The shared database is not available in this view."), i(!0);
            return;
          }
          u = c.collection(e).onSnapshot(
            (d) => {
              r(d.docs.map((h) => h.data())), i(!0);
            },
            (d) => {
              a(d.message), i(!0);
            },
          );
        }),
        () => u?.()
      );
    }, [e, t]),
    { rows: n, ready: l, error: s }
  );
}
async function kt() {
  const e = await dn("db");
  if (!e) throw new Error("The shared database is not available in this view.");
  return e;
}
const ut = () => new Date().toISOString();
async function Yh(e, t, n) {
  const r = await kt(),
    l = e.source.messageId
      ? `msg-${await Qh(e.source.messageId)}`
      : e.source.contentHash
        ? `hash-${e.source.contentHash}`
        : null;
  if (l) {
    const h = await r.doc(`ingest/${l}`).get();
    if (h.exists) {
      const m = h.data(),
        y = Rr(e.draft);
      if ((m.reviewIds ?? []).length && t.some((w) => w.dedupeKey === y))
        return { status: "duplicate-source", existing: m.reviewIds ?? [] };
    }
  }
  const i = Rr(e.draft),
    s = t.find((h) => h.dedupeKey === i && h.reviewStatus !== "rejected");
  if (s)
    return (
      await Kh(s.id, e.source),
      l && (await hu(l, s.id, e.source)),
      { status: "duplicate-record", id: s.id }
    );
  let a = e.draft.id;
  const u = new Set([...t.map((h) => h.id), ...n]);
  for (let h = 2; u.has(a); h++) a = `${e.draft.id}-${h}`.slice(0, 70);
  const c = ut(),
    d = {
      id: a,
      reviewStatus: "draft",
      draft: { ...e.draft, id: a, created: c, updated: c, lastVerified: c },
      evidence: e.evidence,
      flags: [...e.flags, ...e.errors],
      sources: [e.source],
      notes: "",
      duplicateOf: null,
      changedFields: [],
      history: [
        {
          at: c,
          action: `Draft created from ${e.source.kind}`,
          note: e.source.label,
        },
      ],
      dedupeKey: i,
      isDemo: e.draft.isDemo,
      created: c,
      updated: c,
    };
  return (
    await r.doc(`review/${a}`).set(Me(d)),
    l && (await hu(l, a, e.source)),
    { status: "created", id: a }
  );
}
async function Qh(e) {
  const { sha256: t } = await _h(
    async () => {
      const { sha256: n } = await Promise.resolve().then(() => ph);
      return { sha256: n };
    },
    void 0,
    import.meta.url,
  );
  return t(e);
}
async function hu(e, t, n) {
  const l = (await kt()).doc(`ingest/${e}`),
    i = await l.get(),
    s = i.exists ? (i.data().reviewIds ?? []) : [];
  await l.set(
    Me({
      key: e,
      kind: n.kind,
      label: n.label,
      processedAt: ut(),
      reviewIds: Array.from(new Set([...s, t])),
    }),
  );
}
async function Kh(e, t) {
  const r = (await kt()).doc(`review/${e}`),
    l = await r.get();
  if (!l.exists) return;
  const i = l.data();
  await r.update(
    Me({
      sources: [...i.sources, t],
      updated: ut(),
      history: [
        ...i.history,
        { at: ut(), action: "Repeat announcement attached", note: t.label },
      ],
    }),
  );
}
async function gu(e, t, n = {}, r = "Draft saved") {
  const l = await kt(),
    i = ut(),
    s = Vr(e.draft, t);
  await l
    .doc(`review/${e.id}`)
    .update(
      Me({
        ...n,
        draft: { ...t, updated: i },
        dedupeKey: Rr(t),
        updated: i,
        history: [...e.history, { at: i, action: r, fields: s }],
      }),
    );
}
async function Zh(e, t, n) {
  const r = Hr(t).filter((a) => a.blocking);
  if (r.length) throw new Error(r.map((a) => a.text).join(" "));
  const l = await kt(),
    i = ut(),
    s = { ...t, id: e.id, updated: i, lastVerified: i };
  await l.doc(`events/${e.id}`).set(Me(s)),
    await l
      .doc(`review/${e.id}`)
      .update(
        Me({
          reviewStatus: "approved",
          draft: s,
          updated: i,
          dedupeKey: Rr(s),
          ...(n != null ? { notes: n } : {}),
          history: [
            ...e.history,
            {
              at: i,
              action: "Approved and published",
              fields: Vr(e.draft, s).filter((a) => a !== "lastVerified"),
            },
          ],
        }),
      );
}
async function vu(e, t, n) {
  const r = await kt(),
    l = ut();
  await r
    .doc(`review/${e.id}`)
    .update(
      Me({
        reviewStatus: t,
        notes: n || e.notes,
        updated: l,
        history: [
          ...e.history,
          { at: l, action: `Marked ${t.replace("_", " ")}`, note: n },
        ],
      }),
    );
}
async function Qd(e, t, n, r) {
  const l = Hr(n).filter((c) => c.blocking);
  if (l.length) throw new Error(l.map((c) => c.text).join(" "));
  const i = await kt(),
    s = ut(),
    a = Vr(t, n),
    u = { ...n, id: t.id, created: t.created, updated: s, lastVerified: s };
  await i.doc(`events/${t.id}`).set(Me(u)),
    e &&
      (await i
        .doc(`review/${t.id}`)
        .update(
          Me({
            draft: u,
            changedFields: a,
            updated: s,
            dedupeKey: Rr(u),
            history: [...e.history, { at: s, action: r, fields: a }],
          }),
        ));
}
async function Gh(e, t, n, r) {
  const l = { ...t };
  for (const a of r) l[a] = e.draft[a];
  await Qd(n, t, l, `Correction applied from ${e.id}`);
  const i = await kt(),
    s = ut();
  if (n) {
    const a = (await i.doc(`review/${t.id}`).get()).data();
    await i
      .doc(`review/${t.id}`)
      .update(Me({ sources: [...a.sources, ...e.sources], changedFields: r }));
  }
  await i
    .doc(`review/${e.id}`)
    .update(
      Me({
        reviewStatus: "rejected",
        duplicateOf: t.id,
        changedFields: r,
        updated: s,
        history: [
          ...e.history,
          { at: s, action: `Merged into ${t.id} as a correction`, fields: r },
        ],
      }),
    );
}
async function qh(e, t) {
  await (await kt())
    .doc(`sources/${e.id}`)
    .update(Me({ lastSuccessfulCheck: ut() }));
}
