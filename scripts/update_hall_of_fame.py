#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hält die HJ-Alben "Hall of Fame" und "Top 100" automatisch aktuell,
sortiert absteigend nach SoundCloud-Streams der Playlist "Hall of Fame".

- Liest die öffentliche SC-Playlist (kein API-Key nötig; client_id wird
  bei jedem Lauf frisch aus den SoundCloud-Assets geholt, da sie rotiert).
- Ordnet SC-Tracks den HJ-Songs zu (Permalink==Slug, dann Titel+Artist, dann Fuzzy).
- Schreibt playlist_tracks für hall-of-fame (alle) und top-100 (Top 100).
- Nutzt den öffentlichen Supabase-Key (identisch zu index.html) → kein GitHub-Secret nötig.
- Sicherheitsnetz: In-Memory-Backup je Playlist + Restore bei Insert-Fehler,
  Abbruch wenn unplausibel wenige Treffer.

Lauf:  python3 scripts/update_hall_of_fame.py            (schreibt)
       DRY_RUN=1 python3 scripts/update_hall_of_fame.py  (nur anzeigen)
"""
import re, os, sys, json, time, unicodedata, difflib, urllib.request, urllib.parse, urllib.error

SB_URL       = "https://ywfpzdniicfrhnrvfqfe.supabase.co"
SB_KEY       = "sb_publishable_P5e_bUSC5yG06QnucNn1BA_ss_uVrzS"   # öffentlich, steht auch in index.html
PLAYLIST_URL = "https://soundcloud.com/joern-kaemper/sets/hall-of-fame"
HOF_SLUG     = "hall-of-fame"
TOP100_SLUG  = "top-100"
TOP100_N     = 100
MIN_STREAMS  = 500   # Nur Songs ab dieser Stream-Zahl kommen in die Hall of Fame (später ggf. 400)
MIN_TRACKS   = 80    # Sicherheitsabbruch, falls Zuordnung unplausibel klein (Schutz vor SoundCloud-Fehlern)
# Manuelle Korrekturen: SC-Permalink -> HJ-Slug (z. B. Umlaut-Permalinks)
OVERRIDE     = {"no-no": "noe-noe"}
UA           = {"User-Agent": "Mozilla/5.0"}
DRY_RUN      = os.environ.get("DRY_RUN") == "1"


# ---------- SoundCloud lesen ----------
def http(url, headers=None):
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers or UA), timeout=60).read().decode("utf-8", "ignore")

def get_client_id(html):
    for u in re.findall(r'<script[^>]+src="(https://[^"]+\.js)"', html):
        try:
            body = http(u)
        except Exception:
            continue
        m = re.search(r'client_id\s*[:=]\s*"([A-Za-z0-9]{25,40})"', body) or re.search(r'client_id=([A-Za-z0-9]{25,40})', body)
        if m:
            return m.group(1)
    raise RuntimeError("client_id nicht gefunden")

def get_sc_tracks():
    html = http(PLAYLIST_URL)
    cid = get_client_id(html)
    data = json.loads(re.search(r'window\.__sc_hydration\s*=\s*(\[.*?\]);', html, re.S).group(1))
    pl = [d["data"] for d in data if d.get("hydratable") == "playlist"][0]
    ids = [t["id"] for t in pl["tracks"]]
    out = []
    for i in range(0, len(ids), 50):
        url = "https://api-v2.soundcloud.com/tracks?ids=" + urllib.parse.quote(",".join(map(str, ids[i:i+50]))) + "&client_id=" + cid
        for t in json.loads(http(url)):
            pm = t.get("publisher_metadata") or {}
            out.append({
                "permalink": t.get("permalink"),
                "title":     t.get("title"),
                "streams":   t.get("playback_count") or 0,
                "artist":    pm.get("artist") or (t.get("user") or {}).get("username"),
            })
        time.sleep(0.15)
    return out


# ---------- Supabase ----------
def sb(method, path, body=None, prefer=None):
    h = {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(SB_URL + path, data=data, headers=h, method=method)
    resp = urllib.request.urlopen(r, timeout=60)
    return resp.status, resp.read().decode()

def sb_get(path):
    h = {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY}
    return json.loads(urllib.request.urlopen(urllib.request.Request(SB_URL + path, headers=h), timeout=60).read())


# ---------- Zuordnung SC -> HJ ----------
def translit(s):
    s = (s or "").lower()
    for a, b in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("’", "'"), ("`", "'"), ("´", "'")]:
        s = s.replace(a, b)
    return s

def normbase(s):
    s = translit(s)
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = s.replace("'", "")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "", s)

def anorm(s):
    return re.sub(r"[^a-z0-9]+", "", translit(s))

def build_order(sc, songs):
    from collections import defaultdict
    by_slug = {s["slug"]: s for s in songs}
    by_base = defaultdict(list)
    for s in songs:
        by_base[normbase(s["title"])].append(s)
    bases = list(by_base.keys())

    def match(x):
        if x["permalink"] in OVERRIDE:
            return by_slug.get(OVERRIDE[x["permalink"]])
        if x["permalink"] in by_slug:
            return by_slug[x["permalink"]]
        c = by_base.get(normbase(x["title"]), [])
        if len(c) == 1:
            return c[0]
        if len(c) > 1:
            b = [k for k in c if anorm(k["artist"]) == anorm(x["artist"])]
            return b[0] if b else c[0]
        nb = normbase(x["title"]); best = None; br = 0.0
        for bb in bases:
            r = difflib.SequenceMatcher(None, nb, bb).ratio()
            if r > br:
                br, best = r, bb
        if best and br >= 0.88 and len(by_base[best]) == 1:
            return by_base[best][0]
        return None

    seen, order = set(), []
    for x in sorted(sc, key=lambda z: -(z["streams"] or 0)):
        if (x["streams"] or 0) < MIN_STREAMS:
            break   # Liste ist absteigend sortiert -> ab hier sind alle unter der Schwelle
        h = match(x)
        if not h or h["slug"] in seen:
            continue
        seen.add(h["slug"]); order.append(h["slug"])
    return order


# ---------- Schreiben (mit Restore-Sicherung) ----------
def write_playlist(slug, slugs):
    backup = sb_get("/rest/v1/playlist_tracks?playlist_slug=eq.%s&select=song_slug,position&order=position" % slug)
    if DRY_RUN:
        print("  [DRY_RUN] %s: %d -> %d Songs (kein Schreiben)" % (slug, len(backup), len(slugs)))
        return
    try:
        sb("DELETE", "/rest/v1/playlist_tracks?playlist_slug=eq.%s" % slug)
        rows = [{"playlist_slug": slug, "song_slug": s, "position": i} for i, s in enumerate(slugs, 1)]
        sb("POST", "/rest/v1/playlist_tracks", rows, prefer="return=minimal")
        print("  %s: %d Songs geschrieben" % (slug, len(slugs)))
    except Exception as e:
        print("  FEHLER bei %s (%s) -> stelle Backup wieder her" % (slug, e))
        rows = [{"playlist_slug": slug, "song_slug": r["song_slug"], "position": r["position"]} for r in backup]
        if rows:
            sb("POST", "/rest/v1/playlist_tracks", rows, prefer="return=minimal")
        raise


def ensure_playlist_row(n):
    row = {"slug": HOF_SLUG, "title": "Hall of Fame", "description": "Nach Streams · %d Songs" % n,
           "album_key": "hallOfFame", "is_active": True}
    if DRY_RUN:
        return
    try:
        sb("POST", "/rest/v1/playlists?on_conflict=slug", row, prefer="resolution=merge-duplicates,return=minimal")
    except Exception as e:
        print("  Hinweis: playlists-Row-Upsert übersprungen (%s)" % e)


def main():
    print("Lade HJ-Songs …")
    songs = sb_get("/rest/v1/songs?select=slug,title,artist&limit=2000")
    print("  %d Songs" % len(songs))
    print("Lese SoundCloud-Playlist …")
    sc = get_sc_tracks()
    print("  %d SC-Tracks" % len(sc))
    order = build_order(sc, songs)
    print("Zuordenbar: %d Songs (Top: %s)" % (len(order), ", ".join(order[:3])))
    if len(order) < MIN_TRACKS:
        print("ABBRUCH: nur %d Treffer (< %d) – vermutlich SoundCloud-Änderung. Nichts geschrieben." % (len(order), MIN_TRACKS))
        sys.exit(1)
    ensure_playlist_row(len(order))
    write_playlist(HOF_SLUG, order)
    write_playlist(TOP100_SLUG, order[:TOP100_N])
    print("Fertig.")


if __name__ == "__main__":
    main()
