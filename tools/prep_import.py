"""Prepare a large extraction file for Admin -> Import JSON.

- Drops events whose start date (Philadelphia) is before --today, unless status is
  canceled or postponed (those can still matter to students who saw the original post).
- Keeps records with no confirmed date, with their flags, for human review.
- Merges likely duplicate promos: same organizer, same start date, similar title.
  The record with the most filled-in fields is kept; the others' source labels,
  links and flags are noted on it so the reviewer can see every promo.
- Writes batches of at most 50 records (the import screen's limit) and a report.

Usage: python3 -I tools/prep_import.py IN.json OUT_DIR --today 2026-11-13
"""
import argparse, json, re, unicodedata
from pathlib import Path


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


STOP = {"the", "and", "for", "with", "penn", "upenn", "event", "night", "info", "session", "join", "our", "your"}


def words(s):
    return {w for w in norm(s).split() if len(w) > 2 and w not in STOP}


def similar(a, b):
    A, B = words(a), words(b)
    if not A or not B:
        return norm(a) == norm(b)
    return len(A & B) / min(len(A), len(B)) >= 0.5


def filled(rec):
    ev = rec.get("event") or {}
    return sum(1 for v in ev.values() if v not in (None, "", [], {}, False))


def start_date(rec):
    s = (rec.get("event") or {}).get("startLocal")
    if isinstance(s, str) and re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    # date known but no start time: the extractor records it in a flag
    for f in rec.get("flags") or []:
        m = re.search(r"Date (?:stated|inferred)[^0-9]*\((\d{4}-\d{2}-\d{2})\)", f) or re.match(r"Date stated \((\d{4}-\d{2}-\d{2})\)", f)
        if m:
            return m.group(1)
    return None


def flagged_past(rec):
    return any("before capture date" in f.lower() for f in rec.get("flags") or [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out"); ap.add_argument("--today", required=True)
    a = ap.parse_args()
    data = json.loads(Path(a.inp).read_text())
    recs = data if isinstance(data, list) else data.get("items", [])
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    past, keep = [], []
    for r in recs:
        ev = r.get("event") or {}
        d = start_date(r)
        if ((d and d < a.today) or flagged_past(r)) and ev.get("status") not in ("canceled", "postponed"):
            past.append(r)
        else:
            keep.append(r)

    merged, groups = [], []
    for r in keep:
        ev = r.get("event") or {}
        org, d, title = norm(ev.get("organizer")), start_date(r), ev.get("title") or ""
        for g in groups:
            gev = g[0].get("event") or {}
            if org and org == norm(gev.get("organizer")) and d == start_date(g[0]) and similar(title, gev.get("title") or ""):
                g.append(r); break
        else:
            groups.append([r])
    dup_count = 0
    for g in groups:
        g.sort(key=filled, reverse=True)
        best = json.loads(json.dumps(g[0]))
        if len(g) > 1:
            dup_count += len(g) - 1
            notes = []
            for o in g[1:]:
                src = o.get("source") or {}
                notes.append(f"{src.get('label') or 'another promo'}" + (f" ({src['url']})" if src.get("url") else ""))
                for f in o.get("flags") or []:
                    if f not in best.setdefault("flags", []) and "duplicate" not in f.lower():
                        best["flags"].append(f)
            best.setdefault("flags", []).append("Also promoted in: " + "; ".join(notes)[:280])
        best["flags"] = [f for f in best.get("flags", []) if "duplicate promo" not in f.lower()]
        merged.append(best)

    merged.sort(key=lambda r: (start_date(r) or "9999", norm((r.get("event") or {}).get("organizer"))))
    batches = [merged[i:i + 50] for i in range(0, len(merged), 50)]
    for i, b in enumerate(batches, 1):
        (out / f"batch-{i}.json").write_text(json.dumps(b, indent=1, ensure_ascii=False))

    private = sum(1 for r in merged if any("private channel" in f.lower() for f in r.get("flags", [])))
    nodate = sum(1 for r in merged if not start_date(r))
    report = [
        f"Input records: {len(recs)}",
        f"Dropped as already past (before {a.today}): {len(past)}",
        f"Merged duplicate promos: {dup_count}",
        f"Records to import: {len(merged)} in {len(batches)} batch(es) of up to 50",
        f"  without a confirmed date: {nodate}",
        f"  flagged possibly private channel: {private}",
        f"  canceled or postponed: {sum(1 for r in merged if (r.get('event') or {}).get('status') in ('canceled','postponed'))}",
    ]
    (out / "report.txt").write_text("\n".join(report) + "\n")
    print("\n".join(report))


if __name__ == "__main__":
    main()
