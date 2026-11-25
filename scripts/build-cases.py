#!/usr/bin/env python3
"""Generate static {slug}/index.html pages from projects-data.js (Python fallback for Node)."""
from __future__ import annotations

import html as H
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://svetla-brd.github.io/svetlabardarova.github.io"


def load_projects():
    code = (ROOT / "projects-data.js").read_text()
    m = re.search(r"window\.PROJECTS\s*=\s*(\[[\s\S]*\])\s*;?\s*$", code.strip())
    if not m:
        sys.exit("could not parse PROJECTS from projects-data.js")
    return json.loads(m.group(1))


def esc(s: str) -> str:
    return H.escape(str(s or ""), quote=True)


def abs_url(rel: str) -> str:
    if not rel:
        return ""
    if re.match(r"^https?:", rel, re.I):
        return rel
    return f"{SITE_ORIGIN}/{rel.lstrip('/')}"


def page_asset(src: str) -> str:
    if not src:
        return ""
    if re.match(r"^https?:", src, re.I):
        return src
    return f"../{src.lstrip('/')}"


def slugify(s: str) -> str:
    t = re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()).strip("-")
    return t or "section"


def short_label(title: str) -> str:
    t = re.sub(r"[:：]\s*$", "", str(title or "")).strip()
    if re.search(r"[—–-]", t):
        t = re.split(r"[—–-]", t)[0].strip()
    if len(t) > 18:
        t = re.sub(r"\s+\S*$", "", t[:16]) or t[:16]
    return t


def parse_copy_sections(copy):
    used, sections, loose = {}, [], []
    for i, block in enumerate(copy or []):
        parts = str(block).split("\n")
        first = (parts[0] or "").strip()
        titled, title, body = False, None, None
        if re.search(r"[:：]\s*$", first) and len(parts) > 1:
            title = re.sub(r"[:：]\s*$", "", first).strip()
            body = "\n".join(parts[1:]).strip()
            titled = True
        elif first and len(first) < 56 and len(parts) > 1 and not re.search(r"[:：]", first):
            title, body, titled = first, "\n".join(parts[1:]).strip(), True
        else:
            loose.append(str(block).strip())
        if not titled:
            continue
        id_ = slugify(short_label(title))
        if id_ in used:
            id_ = f"{id_}-{i + 1}"
        used[id_] = True
        sections.append({"id": id_, "title": title, "label": short_label(title), "body": body})
    return {"sections": sections, "loose": loose}


def cover_img(p, alt=None):
    src = page_asset(p.get("cover") or "")
    if not src:
        return ""
    return (
        f'<img src="{esc(src)}" alt="{esc(alt or p.get("name") or "")}" '
        f'loading="lazy" decoding="async">'
    )


def card(p):
    return (
        f'<article class="item"><a href="../{esc(p["slug"])}/"><div class="tile">'
        f'{cover_img(p) or ""}</div><div class="cap"><span>{esc(p["name"])}</span>'
        f'<span class="yr">{esc(p.get("year", ""))}</span></div></a></article>'
    )


def render_onboarding_ui(m):
    hero = page_asset(m.get("hero") or "")
    about = m.get("about") or ""
    phones = []
    dots = []
    phone_list = m.get("phones") or []
    start_i = 0
    for i, p in enumerate(phone_list):
        src = page_asset(p.get("src") or "")
        cap = p.get("caption") or ""
        if cap.strip().lower() == "welcome":
            start_i = i
        phones.append(
            f'<figure class="c-phone" data-caption="{esc(cap)}">'
            f'<div class="c-phone-shot">'
            f'<img src="{esc(src)}" alt="" loading="eager" decoding="async">'
            f"</div>"
            + (f'<figcaption class="c-phone-cap">{esc(cap)}</figcaption>' if cap else "")
            + "</figure>"
        )
        dots.append(
            f'<button type="button" class="c-ui-dot{" is-active" if i == start_i else ""}" '
            f'data-index="{i}" aria-label="{esc(cap or f"Screen {i + 1}")}"></button>'
        )
    start_cap = (phone_list[start_i].get("caption") if phone_list else "") or ""
    return (
        f'<div class="c-ui-show is-onboarding">'
        f'<div class="c-ui-hero"><img src="{esc(hero)}" alt="" loading="eager" decoding="async"></div>'
        f'<div class="c-ui-about">'
        f'<div class="c-ui-about-head">'
        f'<h3>{esc(m.get("label") or "(A) Onboarding")}</h3>'
        f'<h3>{esc(m.get("aboutTitle") or "About")}</h3>'
        f"</div>"
        f'<p class="c-ui-about-body">{esc(about)}</p>'
        f"</div>"
        f'<div class="c-ui-carousel" data-start="{start_i}">'
        f'<div class="c-ui-phones-viewport">'
        f'<div class="c-ui-phones">{"".join(phones)}</div>'
        f"</div>"
        f'<p class="c-ui-slide-title" aria-live="polite">{esc(start_cap)}</p>'
        f'<div class="c-ui-carousel-nav" aria-label="Onboarding screens">'
        f'<button type="button" class="c-ui-arrow c-ui-prev" aria-label="Previous screen">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>'
        f"</button>"
        f'<div class="c-ui-dots" role="tablist">{"".join(dots)}</div>'
        f'<button type="button" class="c-ui-arrow c-ui-next" aria-label="Next screen">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
        f"</button>"
        f"</div></div></div>"
    )


def render_phone_group(m):
    phones = m.get("phones") or []
    caption = m.get("caption") or ""
    label = caption or "Wireframe screens"
    shots = []
    dots = []
    for i, p in enumerate(phones):
        if isinstance(p, dict):
            src = page_asset(p.get("src") or "")
            cap = p.get("caption") or ""
        else:
            src = page_asset(p)
            cap = ""
        shots.append(
            f'<figure class="c-phone" data-caption="{esc(cap)}">'
            f'<div class="c-phone-shot">'
            f'<img src="{esc(src)}" alt="" loading="lazy" decoding="async">'
            f"</div>"
            + (f'<figcaption class="c-phone-cap">{esc(cap)}</figcaption>' if cap else "")
            + "</figure>"
        )
        dots.append(
            f'<button type="button" class="c-ui-dot{" is-active" if i == 0 else ""}" '
            f'data-index="{i}" aria-label="{esc(cap or f"Screen {i + 1}")}"></button>'
        )
    return (
        f'<figure class="c-wf-group">'
        f'<div class="c-ui-carousel" data-start="0">'
        f'<div class="c-ui-phones-viewport">'
        f'<div class="c-ui-phones">{"".join(shots)}</div>'
        f"</div>"
        f'<p class="c-ui-slide-title" aria-live="polite">{esc((phones[0].get("caption") if phones and isinstance(phones[0], dict) else "") or "")}</p>'
        f'<div class="c-ui-carousel-nav" aria-label="{esc(label)}">'
        f'<button type="button" class="c-ui-arrow c-ui-prev" aria-label="Previous screen">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>'
        f"</button>"
        f'<div class="c-ui-dots" role="tablist">{"".join(dots)}</div>'
        f'<button type="button" class="c-ui-arrow c-ui-next" aria-label="Next screen">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'
        f"</button>"
        f"</div></div>"
        + (f'<figcaption class="c-figcap">{esc(caption)}</figcaption>' if caption else "")
        + "</figure>"
    )


def render_media(items, cols=None):
    if not items:
        return ""
    cls = "c-media"
    n = len(items)
    if cols == 2 or (cols is None and n == 2):
        cls += " cols-2"
    elif cols == 3 or (cols is None and n == 3):
        cls += " cols-3"
    bits = []
    for m in items:
        if isinstance(m, dict) and m.get("ui") == "onboarding":
            bits.append(render_onboarding_ui(m))
            continue
        if isinstance(m, dict) and m.get("group") == "phones":
            bits.append(render_phone_group(m))
            continue
        if isinstance(m, str):
            src, caption, extra = m, "", ""
        else:
            src = m.get("src", "")
            caption = m.get("caption") or ""
            extra = f" {m['className']}" if m.get("className") else ""
        bits.append(
            f'<figure class="c-figure{extra}"><div class="tile">'
            f'<img src="{esc(page_asset(src))}" alt="" loading="lazy" decoding="async"></div>'
            + (f'<figcaption class="c-figcap">{esc(caption)}</figcaption>' if caption else "")
            + "</figure>"
        )
    return f'<div class="{cls}">' + "".join(bits) + "</div>"


def render_finding_card(card, kind):
    shared = " is-shared" if card.get("shared") else ""
    if kind == "personas":
        return (
            f'<article class="c-finding-card is-persona">'
            f'<h3>{esc(card.get("name") or "")}</h3>'
            f'<p class="c-finding-role">{esc(card.get("role") or "")}</p>'
            f'<p class="c-finding-quote">{esc(card.get("quote") or "")}</p>'
            f"</article>"
        )
    items = card.get("items") or []
    return (
        f'<article class="c-finding-card{shared}">'
        + ('<span class="c-finding-star" aria-label="Shared by at least 3 personas">★</span>' if card.get("shared") else "")
        + f'<h3>{esc(card.get("title") or "")}</h3>'
        + "<ul>"
        + "".join(f"<li>{esc(item)}</li>" for item in items)
        + "</ul>"
        + (f'<p class="c-finding-who">{esc(card.get("who") or "")}</p>' if card.get("who") else "")
        + "</article>"
    )


def render_findings(findings):
    if not findings:
        return ""
    panels = []
    for panel in findings:
        kind = panel.get("kind") or "pain"
        cards = "".join(render_finding_card(c, kind) for c in panel.get("cards") or [])
        panels.append(
            f'<div class="c-finding kind-{esc(kind)}">'
            f'<header class="c-finding-head">'
            f'<p class="c-finding-pill">{esc(panel.get("title") or "")}</p>'
            f'<p class="c-finding-sub">{esc(panel.get("subtitle") or "")}</p>'
            f"</header>"
            f'<div class="c-finding-grid">{cards}</div>'
            f"</div>"
        )
    return '<div class="c-findings">' + "".join(panels) + "</div>"


def render_structured_section(s):
    html = f'<section class="c-section" id="{esc(s["id"])}">'
    if s.get("kicker"):
        html += f'<p class="c-kicker">{esc(s["kicker"])}</p>'
    if s.get("title"):
        html += f"<h2>{esc(s['title'])}</h2>"
    for t in s.get("body") or []:
        html += f'<p class="c-body">{esc(t)}</p>'
    if s.get("bullets"):
        html += "<ul class=\"c-list\">" + "".join(f"<li>{esc(b)}</li>" for b in s["bullets"]) + "</ul>"
    if s.get("callout"):
        html += f'<p class="c-callout">{esc(s["callout"])}</p>'
    html += render_media(s.get("mediaBefore"), 1)
    if s.get("asideLabel"):
        html += (
            f'<div class="c-rail"><p class="c-rail-label">{esc(s["asideLabel"])}</p>'
            f'<div class="c-rail-body">{render_media(s.get("media"), 1)}</div></div>'
        )
    else:
        html += render_media(s.get("media"), s.get("mediaCols"))
    html += render_findings(s.get("findings"))
    if s.get("table") and s["table"].get("rows"):
        headers = s["table"].get("headers") or []
        h0 = headers[0] if len(headers) > 0 else "Insight"
        h1 = headers[1] if len(headers) > 1 else "Design decision"
        rows_html = []
        for row in s["table"]["rows"]:
            left = row[0] if len(row) > 0 else ""
            right = row[1] if len(row) > 1 else ""
            rows_html.append(
                f'<div class="c-insight-row">'
                f'<div class="c-insight-block is-insight">'
                f'<p class="c-insight-label">'
                f'<span class="c-insight-ico" aria-hidden="true">'
                f'<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/>'
                f'<path d="M12 3a6 6 0 0 0-3.5 10.8c.7.6 1.1 1.4 1.2 2.2h4.6c.1-.8.5-1.6 1.2-2.2A6 6 0 0 0 12 3Z"/>'
                f"</svg></span>{esc(h0)}</p>"
                f'<p class="c-insight-text">{esc(left)}</p>'
                f"</div>"
                f'<span class="c-insight-arrow" aria-hidden="true">'
                f'<svg class="is-right" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
                f'<svg class="is-down" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>'
                f"</span>"
                f'<div class="c-insight-block is-decision">'
                f'<p class="c-insight-label">'
                f'<span class="c-insight-ico" aria-hidden="true">'
                f'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/>'
                f'<path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg></span>{esc(h1)}</p>'
                f'<p class="c-insight-text">{esc(right)}</p>'
                f"</div>"
                f"</div>"
            )
        html += '<div class="c-insights">' + "".join(rows_html) + "</div>"
    for t in s.get("bodyAfter") or []:
        html += f'<p class="c-body">{esc(t)}</p>'
    ma = s.get("mediaAfter")
    html += render_media(ma, 3 if ma and len(ma) == 3 else None)
    if s.get("note"):
        html += f'<p class="c-note">{esc(s["note"])}</p>'
    if s.get("decisions"):
        html += '<div class="c-decisions">'
        for d in s["decisions"]:
            html += (
                f'<article class="c-decision"><h3>{esc(d["title"])}</h3><dl>'
                f'<div><dt>Options</dt><dd>{esc(d["options"])}</dd></div>'
                f'<div><dt>Why</dt><dd>{esc(d["why"])}</dd></div>'
                f'<div><dt>Trade-off</dt><dd>{esc(d["tradeoff"])}</dd></div>'
                f"</dl></article>"
            )
        html += "</div>"
    if s.get("split"):
        L, R = s["split"]["left"], s["split"]["right"]
        html += (
            f'<div class="c-split"><div><h3>{esc(L["title"])}</h3><ul class="c-list">'
            + "".join(f"<li>{esc(b)}</li>" for b in L["items"])
            + f'</ul></div><div><h3>{esc(R["title"])}</h3><ul class="c-list">'
            + "".join(f"<li>{esc(b)}</li>" for b in R["items"])
            + "</ul></div></div>"
        )
    if s.get("cta"):
        c = s["cta"]
        html += (
            f'<div class="c-cta"><p>{esc(c["text"])}</p>'
            f'<a href="{esc(c["href"])}">{esc(c["linkLabel"])}</a></div>'
        )
    return html + "</section>"


def render_case_body(p, projects):
    i = projects.index(p)
    more = [projects[(i + 1) % len(projects)], projects[(i + 2) % len(projects)]]
    structured = bool(p.get("sections"))
    parsed = {"sections": [], "loose": []} if structured else parse_copy_sections(p.get("copy"))
    sections = p["sections"] if structured else parsed["sections"]
    hero_id = "hero" if structured else "overview"
    if structured:
        toc_items = [{"id": "hero", "label": "Intro"}] + [
            {"id": s["id"], "label": s.get("label") or short_label(s.get("title"))}
            for s in sections
        ]
    else:
        toc_items = [{"id": "overview", "label": "Overview"}] + [
            {"id": s["id"], "label": s["label"]} for s in sections
        ]
        if p.get("gallery"):
            toc_items.append({"id": "gallery", "label": "Gallery"})
    toc_items.append({"id": "more", "label": "More"})
    toc = (
        '<aside class="c-toc" aria-label="Case navigation">'
        '<a class="c-toc-back" href="../">← Back</a>'
        '<nav class="c-toc-nav" aria-label="Case study sections">'
        '<span class="c-toc-tick" aria-hidden="true"></span>'
        + "".join(
            f'<button type="button" data-target="{esc(it["id"])}">{esc(it["label"])}</button>'
            for it in toc_items
        )
        + "</nav></aside>"
    )
    hero_meta = p.get("meta") or [
        {"label": "Year", "value": p.get("year", "")},
        {"label": "Scope", "value": p.get("services", "")},
    ]
    hero = (
        f'<section class="c-section" id="{hero_id}">'
        + (f'<p class="c-eyebrow">{esc(p["eyebrow"])}</p>' if p.get("eyebrow") else "")
        + f'<h1>{esc(p.get("headline") or p["name"])}</h1>'
        + (f'<p class="c-desc">{esc(p["desc"])}</p>' if p.get("desc") else "")
        + "".join(f'<p class="c-body">{esc(t)}</p>' for t in parsed["loose"])
        + '<dl class="c-meta">'
        + "".join(
            f'<div><dt>{esc(m["label"])}</dt><dd>{esc(m["value"])}</dd></div>' for m in hero_meta
        )
        + f'</dl><div class="tile c-cover">{cover_img(p, p["name"]) or ""}</div></section>'
    )
    if structured:
        body = "".join(render_structured_section(s) for s in sections)
    else:
        body = "".join(
            f'<section class="c-section" id="{esc(s["id"])}"><h2>{esc(s["title"])}</h2>'
            + (f'<p class="c-body">{esc(s["body"])}</p>' if s.get("body") else "")
            + "</section>"
            for s in sections
        )
    gallery = ""
    if not structured and p.get("gallery"):
        gallery = (
            '<section class="c-section" id="gallery"><h2>Gallery</h2><div class="c-gallery">'
            + "".join(
                f'<div class="tile"><img src="{esc(page_asset(src))}" alt="" '
                f'loading="lazy" decoding="async"></div>'
                for src in p["gallery"]
            )
            + "</div></section>"
        )
    more_html = (
        '<section class="c-section" id="more">'
        '<div class="work-head"><span>More work</span><a href="../">All work</a></div>'
        f'<div class="grid">{"".join(card(x) for x in more)}</div></section>'
    )
    return (
        f'<div class="c-shell">{toc}<div class="c-main">'
        f'<a class="back" href="../">← Back</a>{hero}{body}{gallery}{more_html}</div></div>'
    )


def render_page(p, projects, socials: str) -> str:
    title = f'{p["name"]} – Svetla Bardarova'
    desc = p.get("desc") or p.get("headline") or p["name"]
    og_image = abs_url(p.get("cover") or "")
    og_url = f'{SITE_ORIGIN}/{p["slug"]}/'
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:title" content="{esc(p["name"])}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(og_image)}">
<meta property="og:url" content="{esc(og_url)}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{esc(og_url)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.css">
<link rel="stylesheet" href="../site.css?v=carousel-space-32">
</head>
<body class="case-open">
<nav class="case-nav" id="case-nav" aria-label="Case study">
  <a class="home case-nav-blend" href="../" aria-label="Home">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/></svg>
  </a>
  <div class="case-nav-end">
    {socials}
    <a class="resume case-nav-blend" href="#" aria-label="Resume">Resume</a>
  </div>
</nav>
<article id="case">
{render_case_body(p, projects)}
</article>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js"></script>
<script src="../case-enhance.js?v=carousel-ease-31"></script>
</body>
</html>
"""


def main():
    projects = load_projects()
    socials_path = ROOT / "scripts" / "_socials.html"
    if socials_path.exists():
        socials = socials_path.read_text().strip()
    else:
        mjs = (ROOT / "scripts" / "build-cases.mjs").read_text()
        m = re.search(r"const SOCIALS = `(.*?)`\.trim\(\);", mjs, re.S)
        if not m:
            sys.exit("could not find SOCIALS in build-cases.mjs")
        socials = m.group(1).strip()
        socials_path.write_text(socials)

    for p in projects:
        out_dir = ROOT / p["slug"]
        out_dir.mkdir(exist_ok=True)
        (out_dir / "index.html").write_text(render_page(p, projects, socials))
        print("wrote", f'{p["slug"]}/index.html')
    print("Built", len(projects), "case pages.")


if __name__ == "__main__":
    main()
