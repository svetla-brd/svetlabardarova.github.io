// Prefer: python3 scripts/build-cases.py (Node may be unavailable locally)
#!/usr/bin/env node
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE_ORIGIN = "https://svetla-brd.github.io/svetlabardarova.github.io";

const sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "projects-data.js"), "utf8"),
  sandbox
);
const PROJECTS = sandbox.window.PROJECTS || [];

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function absUrl(rel) {
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  return SITE_ORIGIN + "/" + String(rel).replace(/^\//, "");
}

function pageAsset(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  return "../" + String(src).replace(/^\//, "");
}

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "section"
  );
}

function shortLabel(title) {
  var t = String(title || "")
    .replace(/[:：]\s*$/, "")
    .trim();
  if (/[—–-]/.test(t)) t = t.split(/[—–-]/)[0].trim();
  if (t.length > 18)
    t = t.slice(0, 16).replace(/\s+\S*$/, "") || t.slice(0, 16);
  return t;
}

function parseCopySections(copy) {
  var used = {};
  var sections = [];
  var loose = [];
  (copy || []).forEach(function (block, i) {
    var parts = String(block).split("\n");
    var first = (parts[0] || "").trim();
    var title,
      body,
      titled = false;
    if (/[:：]\s*$/.test(first) && parts.length > 1) {
      title = first.replace(/[:：]\s*$/, "").trim();
      body = parts.slice(1).join("\n").trim();
      titled = true;
    } else if (
      first.length &&
      first.length < 56 &&
      parts.length > 1 &&
      !/[:：]/.test(first)
    ) {
      title = first;
      body = parts.slice(1).join("\n").trim();
      titled = true;
    } else {
      loose.push(String(block).trim());
    }
    if (!titled) return;
    var id = slugify(shortLabel(title));
    if (used[id]) id = id + "-" + (i + 1);
    used[id] = true;
    sections.push({ id: id, title: title, label: shortLabel(title), body: body });
  });
  return { sections: sections, loose: loose };
}

function coverImg(p, alt) {
  var src = pageAsset(p.cover || "");
  if (!src) return "";
  return (
    '<img src="' +
    escapeAttr(src) +
    '" alt="' +
    escapeAttr(alt || p.name || "") +
    '" loading="lazy" decoding="async">'
  );
}

function card(p) {
  return (
    '<article class="item"><a href="../' +
    escapeAttr(p.slug) +
    '/"><div class="tile">' +
    (coverImg(p) || "") +
    '</div><div class="cap"><span>' +
    escapeHtml(p.name) +
    '</span><span class="yr">' +
    escapeHtml(p.year) +
    "</span></div></a></article>"
  );
}

function renderOnboardingUi(m) {
  var hero = pageAsset(m.hero || "");
  var about = m.about || "";
  var phoneList = m.phones || [];
  var startI = 0;
  phoneList.forEach(function (p, i) {
    if ((p.caption || "").trim().toLowerCase() === "welcome") startI = i;
  });
  var phones = phoneList
    .map(function (p) {
      var src = pageAsset(p.src || "");
      var cap = p.caption || "";
      return (
        '<figure class="c-phone" data-caption="' +
        escapeAttr(cap) +
        '">' +
        '<div class="c-phone-shot"><img src="' +
        escapeAttr(src) +
        '" alt="" loading="eager" decoding="async"></div>' +
        (cap
          ? '<figcaption class="c-phone-cap">' + escapeHtml(cap) + "</figcaption>"
          : "") +
        "</figure>"
      );
    })
    .join("");
  var dots = phoneList
    .map(function (p, i) {
      var cap = p.caption || "Screen " + (i + 1);
      return (
        '<button type="button" class="c-ui-dot' +
        (i === startI ? " is-active" : "") +
        '" data-index="' +
        i +
        '" aria-label="' +
        escapeAttr(cap) +
        '"></button>'
      );
    })
    .join("");
  var startCap =
    (phoneList[startI] && phoneList[startI].caption) || "";
  return (
    '<div class="c-ui-show is-onboarding">' +
    '<div class="c-ui-hero"><img src="' +
    escapeAttr(hero) +
    '" alt="" loading="eager" decoding="async"></div>' +
    '<div class="c-ui-about"><div class="c-ui-about-head">' +
    "<h3>" +
    escapeHtml(m.label || "(A) Onboarding") +
    "</h3><h3>" +
    escapeHtml(m.aboutTitle || "About") +
    "</h3></div>" +
    '<p class="c-ui-about-body">' +
    escapeHtml(about) +
    "</p></div>" +
    '<div class="c-ui-carousel" data-start="' +
    startI +
    '">' +
    '<div class="c-ui-phones-viewport">' +
    '<div class="c-ui-phones">' +
    phones +
    "</div></div>" +
    '<p class="c-ui-slide-title" aria-live="polite">' +
    escapeHtml(startCap) +
    "</p>" +
    '<div class="c-ui-carousel-nav" aria-label="Onboarding screens">' +
    '<button type="button" class="c-ui-arrow c-ui-prev" aria-label="Previous screen">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>' +
    "</button>" +
    '<div class="c-ui-dots" role="tablist">' +
    dots +
    "</div>" +
    '<button type="button" class="c-ui-arrow c-ui-next" aria-label="Next screen">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' +
    "</button>" +
    "</div></div></div>"
  );
}

function renderPhoneGroup(m) {
  var phones = (m && m.phones) || [];
  var caption = (m && m.caption) || "";
  var label = caption || "Wireframe screens";
  var startCap =
    phones[0] && typeof phones[0] === "object" ? phones[0].caption || "" : "";
  var shots = phones
    .map(function (p) {
      var src = typeof p === "string" ? p : p.src || "";
      var cap = typeof p === "string" ? "" : p.caption || "";
      return (
        '<figure class="c-phone" data-caption="' +
        escapeAttr(cap) +
        '"><div class="c-phone-shot"><img src="' +
        escapeAttr(pageAsset(src)) +
        '" alt="" loading="lazy" decoding="async"></div>' +
        (cap
          ? '<figcaption class="c-phone-cap">' + escapeHtml(cap) + "</figcaption>"
          : "") +
        "</figure>"
      );
    })
    .join("");
  var dots = phones
    .map(function (p, i) {
      var cap =
        typeof p === "string" ? "" : p.caption || "Screen " + (i + 1);
      return (
        '<button type="button" class="c-ui-dot' +
        (i === 0 ? " is-active" : "") +
        '" data-index="' +
        i +
        '" aria-label="' +
        escapeAttr(cap) +
        '"></button>'
      );
    })
    .join("");
  return (
    '<figure class="c-wf-group"><div class="c-ui-carousel" data-start="0">' +
    '<div class="c-ui-phones-viewport"><div class="c-ui-phones">' +
    shots +
    "</div></div>" +
    '<p class="c-ui-slide-title" aria-live="polite">' +
    escapeHtml(startCap) +
    "</p>" +
    '<div class="c-ui-carousel-nav" aria-label="' +
    escapeAttr(label) +
    '">' +
    '<button type="button" class="c-ui-arrow c-ui-prev" aria-label="Previous screen">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>' +
    "</button>" +
    '<div class="c-ui-dots" role="tablist">' +
    dots +
    "</div>" +
    '<button type="button" class="c-ui-arrow c-ui-next" aria-label="Next screen">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' +
    "</button>" +
    "</div></div>" +
    (caption
      ? '<figcaption class="c-figcap">' + escapeHtml(caption) + "</figcaption>"
      : "") +
    "</figure>"
  );
}

function renderMedia(items, cols) {
  if (!items || !items.length) return "";
  var cls = "c-media";
  var n = items.length;
  if (cols === 1) {
    /* full-width stack */
  } else if (cols === 2 || (!cols && n === 2)) cls += " cols-2";
  else if (cols === 3 || (!cols && n === 3)) cls += " cols-3";
  return (
    '<div class="' +
    cls +
    '">' +
    items
      .map(function (m) {
        if (m && typeof m === "object" && m.ui === "onboarding") {
          return renderOnboardingUi(m);
        }
        if (m && typeof m === "object" && m.group === "phones") {
          return renderPhoneGroup(m);
        }
        var src = typeof m === "string" ? m : m.src;
        var caption = typeof m === "string" ? "" : m.caption || "";
        var extra =
          typeof m === "object" && m.className ? " " + m.className : "";
        return (
          '<figure class="c-figure' +
          extra +
          '"><div class="tile"><img src="' +
          escapeAttr(pageAsset(src)) +
          '" alt="" loading="lazy" decoding="async"></div>' +
          (caption
            ? '<figcaption class="c-figcap">' +
              escapeHtml(caption) +
              "</figcaption>"
            : "") +
          "</figure>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderFindingCard(card, kind) {
  if (kind === "personas") {
    return (
      '<article class="c-finding-card is-persona">' +
      "<h3>" +
      escapeHtml(card.name || "") +
      '</h3><p class="c-finding-role">' +
      escapeHtml(card.role || "") +
      '</p><p class="c-finding-quote">' +
      escapeHtml(card.quote || "") +
      "</p></article>"
    );
  }
  var shared = card.shared ? " is-shared" : "";
  return (
    '<article class="c-finding-card' +
    shared +
    '">' +
    (card.shared
      ? '<span class="c-finding-star" aria-label="Shared by at least 3 personas">★</span>'
      : "") +
    "<h3>" +
    escapeHtml(card.title || "") +
    "</h3><ul>" +
    (card.items || [])
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("") +
    "</ul>" +
    (card.who
      ? '<p class="c-finding-who">' + escapeHtml(card.who) + "</p>"
      : "") +
    "</article>"
  );
}

function renderFindings(findings) {
  if (!findings || !findings.length) return "";
  return (
    '<div class="c-findings">' +
    findings
      .map(function (panel) {
        var kind = panel.kind || "pain";
        return (
          '<div class="c-finding kind-' +
          escapeAttr(kind) +
          '">' +
          '<header class="c-finding-head">' +
          '<p class="c-finding-pill">' +
          escapeHtml(panel.title || "") +
          '</p><p class="c-finding-sub">' +
          escapeHtml(panel.subtitle || "") +
          "</p></header>" +
          '<div class="c-finding-grid">' +
          (panel.cards || [])
            .map(function (c) {
              return renderFindingCard(c, kind);
            })
            .join("") +
          "</div></div>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderStructuredSection(s) {
  var html = '<section class="c-section" id="' + escapeAttr(s.id) + '">';
  if (s.kicker) html += '<p class="c-kicker">' + escapeHtml(s.kicker) + "</p>";
  if (s.title) html += "<h2>" + escapeHtml(s.title) + "</h2>";
  (s.body || []).forEach(function (t) {
    html += '<p class="c-body">' + escapeHtml(t) + "</p>";
  });
  if (s.bullets && s.bullets.length) {
    html +=
      '<ul class="c-list">' +
      s.bullets.map(function (b) {
        return "<li>" + escapeHtml(b) + "</li>";
      }).join("") +
      "</ul>";
  }
  if (s.callout)
    html += '<p class="c-callout">' + escapeHtml(s.callout) + "</p>";
  html += renderMedia(s.mediaBefore, 1);
  if (s.asideLabel) {
    html +=
      '<div class="c-rail"><p class="c-rail-label">' +
      escapeHtml(s.asideLabel) +
      '</p><div class="c-rail-body">' +
      renderMedia(s.media, 1) +
      "</div></div>";
  } else {
    html += renderMedia(s.media, s.mediaCols || null);
  }
  html += renderFindings(s.findings);
  if (s.table && s.table.rows) {
    var headers = s.table.headers || [];
    var h0 = headers[0] || "Insight";
    var h1 = headers[1] || "Design decision";
    html +=
      '<div class="c-insights">' +
      s.table.rows
        .map(function (row) {
          var left = row[0] || "";
          var right = row[1] || "";
          return (
            '<div class="c-insight-row">' +
            '<div class="c-insight-block is-insight">' +
            '<p class="c-insight-label">' +
            '<span class="c-insight-ico" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/>' +
            '<path d="M12 3a6 6 0 0 0-3.5 10.8c.7.6 1.1 1.4 1.2 2.2h4.6c.1-.8.5-1.6 1.2-2.2A6 6 0 0 0 12 3Z"/>' +
            "</svg></span>" +
            escapeHtml(h0) +
            '</p><p class="c-insight-text">' +
            escapeHtml(left) +
            "</p></div>" +
            '<span class="c-insight-arrow" aria-hidden="true">' +
            '<svg class="is-right" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>' +
            '<svg class="is-down" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>' +
            "</span>" +
            '<div class="c-insight-block is-decision">' +
            '<p class="c-insight-label">' +
            '<span class="c-insight-ico" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/>' +
            '<path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg></span>' +
            escapeHtml(h1) +
            '</p><p class="c-insight-text">' +
            escapeHtml(right) +
            "</p></div></div>"
          );
        })
        .join("") +
      "</div>";
  }
  (s.bodyAfter || []).forEach(function (t) {
    html += '<p class="c-body">' + escapeHtml(t) + "</p>";
  });
  html += renderMedia(
    s.mediaAfter,
    s.mediaAfter && s.mediaAfter.length === 3 ? 3 : null
  );
  if (s.note) html += '<p class="c-note">' + escapeHtml(s.note) + "</p>";
  if (s.decisions && s.decisions.length) {
    html +=
      '<div class="c-decisions">' +
      s.decisions
        .map(function (d) {
          return (
            '<article class="c-decision"><h3>' +
            escapeHtml(d.title) +
            "</h3><dl>" +
            "<div><dt>Options</dt><dd>" +
            escapeHtml(d.options) +
            "</dd></div>" +
            "<div><dt>Why</dt><dd>" +
            escapeHtml(d.why) +
            "</dd></div>" +
            "<div><dt>Trade-off</dt><dd>" +
            escapeHtml(d.tradeoff) +
            "</dd></div>" +
            "</dl></article>"
          );
        })
        .join("") +
      "</div>";
  }
  if (s.split) {
    html +=
      '<div class="c-split">' +
      "<div><h3>" +
      escapeHtml(s.split.left.title) +
      '</h3><ul class="c-list">' +
      s.split.left.items
        .map(function (b) {
          return "<li>" + escapeHtml(b) + "</li>";
        })
        .join("") +
      "</ul></div><div><h3>" +
      escapeHtml(s.split.right.title) +
      '</h3><ul class="c-list">' +
      s.split.right.items
        .map(function (b) {
          return "<li>" + escapeHtml(b) + "</li>";
        })
        .join("") +
      "</ul></div></div>";
  }
  if (s.cta) {
    html +=
      '<div class="c-cta"><p>' +
      escapeHtml(s.cta.text) +
      '</p><a href="' +
      escapeAttr(s.cta.href) +
      '">' +
      escapeHtml(s.cta.linkLabel) +
      "</a></div>";
  }
  html += "</section>";
  return html;
}

function renderCaseBody(p) {
  var i = PROJECTS.indexOf(p);
  var more = [
    PROJECTS[(i + 1) % PROJECTS.length],
    PROJECTS[(i + 2) % PROJECTS.length],
  ];
  var structured = p.sections && p.sections.length;
  var parsed = structured ? { sections: [], loose: [] } : parseCopySections(p.copy);
  var sections = structured ? p.sections : parsed.sections;
  var heroId = structured ? "hero" : "overview";
  var tocItems = structured
    ? [{ id: "hero", label: "Intro" }].concat(
        sections.map(function (s) {
          return { id: s.id, label: s.label || shortLabel(s.title) };
        })
      )
    : [{ id: "overview", label: "Overview" }].concat(
        sections.map(function (s) {
          return { id: s.id, label: s.label };
        })
      );
  if (!structured && (p.gallery || []).length)
    tocItems.push({ id: "gallery", label: "Gallery" });
  tocItems.push({ id: "more", label: "More" });

  var toc =
    '<aside class="c-toc" aria-label="Case navigation">' +
    '<a class="c-toc-back" href="../">← Back</a>' +
    '<nav class="c-toc-nav" aria-label="Case study sections"><span class="c-toc-tick" aria-hidden="true"></span>' +
    tocItems
      .map(function (item) {
        return (
          '<button type="button" data-target="' +
          escapeAttr(item.id) +
          '">' +
          escapeHtml(item.label) +
          "</button>"
        );
      })
      .join("") +
    "</nav></aside>";

  var heroMeta =
    p.meta && p.meta.length
      ? p.meta
      : [
          { label: "Year", value: p.year },
          { label: "Scope", value: p.services },
        ];

  var hero =
    '<section class="c-section" id="' +
    heroId +
    '">' +
    (p.eyebrow
      ? '<p class="c-eyebrow">' + escapeHtml(p.eyebrow) + "</p>"
      : "") +
    "<h1>" +
    escapeHtml(p.headline || p.name) +
    "</h1>" +
    (p.desc ? '<p class="c-desc">' + escapeHtml(p.desc) + "</p>" : "") +
    parsed.loose
      .map(function (t) {
        return '<p class="c-body">' + escapeHtml(t) + "</p>";
      })
      .join("") +
    '<dl class="c-meta">' +
    heroMeta
      .map(function (m) {
        return (
          "<div><dt>" +
          escapeHtml(m.label) +
          "</dt><dd>" +
          escapeHtml(m.value) +
          "</dd></div>"
        );
      })
      .join("") +
    "</dl>" +
    '<div class="tile c-cover">' +
    (coverImg(p, p.name) || "") +
    "</div>" +
    "</section>";

  var body = structured
    ? sections.map(renderStructuredSection).join("")
    : sections
        .map(function (s) {
          return (
            '<section class="c-section" id="' +
            escapeAttr(s.id) +
            '">' +
            "<h2>" +
            escapeHtml(s.title) +
            "</h2>" +
            (s.body ? '<p class="c-body">' + escapeHtml(s.body) + "</p>" : "") +
            "</section>"
          );
        })
        .join("");

  var gallery =
    !structured && (p.gallery || []).length
      ? '<section class="c-section" id="gallery"><h2>Gallery</h2><div class="c-gallery">' +
        p.gallery
          .map(function (src) {
            return (
              '<div class="tile"><img src="' +
              escapeAttr(pageAsset(src)) +
              '" alt="" loading="lazy" decoding="async"></div>'
            );
          })
          .join("") +
        "</div></section>"
      : "";

  var moreHtml =
    '<section class="c-section" id="more">' +
    '<div class="work-head"><span>More work</span><a href="../">All work</a></div>' +
    '<div class="grid">' +
    more.map(card).join("") +
    "</div></section>";

  return (
    '<div class="c-shell">' +
    toc +
    '<div class="c-main"><a class="back" href="../">← Back</a>' +
    hero +
    body +
    gallery +
    moreHtml +
    "</div></div>"
  );
}

const SOCIALS = `
    <nav class="socials case-nav-blend" aria-label="Elsewhere">
      <a href="https://x.com/" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg></a>
      <a href="https://www.behance.net/" rel="noopener" aria-label="Behance"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.969 16.927a2.56 2.56 0 0 0 1.901.677 2.5 2.5 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.1 5.1 0 0 1-1.9 2.896 5.3 5.3 0 0 1-3.091.88 5.8 5.8 0 0 1-2.284-.433 4.9 4.9 0 0 1-1.723-1.211 5.7 5.7 0 0 1-1.08-1.874 7 7 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.31 5.31 0 0 1 5.088-3.604 4.9 4.9 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187M6.947 4.084a8 8 0 0 1 1.928.198 4.3 4.3 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.5 3.5 0 0 1-.506 1.961 3.7 3.7 0 0 1-1.503 1.287 3.6 3.6 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.6 4.6 0 0 1-.423 2.032 3.95 3.95 0 0 1-1.163 1.413 5.1 5.1 0 0 1-1.683.807 7 7 0 0 1-1.928.259H0V4.084zm-.235 12.9q.464.006.916-.099a2.2 2.2 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.62 2.62 0 0 0-1.696-.505h-3.54v4.279zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.34 2.34 0 0 0-1.163.259 2.5 2.5 0 0 0-.738.62 2.4 2.4 0 0 0-.396.792q-.111.36-.137.734h4.769a3.24 3.24 0 0 0-.679-1.785zm-13.813-.648a2.25 2.25 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.9 1.9 0 0 0-.178-.891 1.3 1.3 0 0 0-.495-.533 1.85 1.85 0 0 0-.711-.274 4 4 0 0 0-.835-.073H3.241v3.631h3.293zM21.62 5.122h-5.976v1.527h5.976z"/></svg></a>
      <a href="https://www.linkedin.com/" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.06 2.06 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg></a>
      <a href="https://www.instagram.com/" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.03.084c-1.277.06-2.149.264-2.91.563a5.9 5.9 0 0 0-2.124 1.388 5.9 5.9 0 0 0-1.38 2.127C.321 4.926.12 5.8.064 7.076s-.069 1.688-.063 4.947.021 3.667.083 4.947c.061 1.277.264 2.149.563 2.911.308.789.72 1.457 1.388 2.123a5.9 5.9 0 0 0 2.129 1.38c.763.295 1.636.496 2.913.552 1.278.056 1.689.069 4.947.063s3.668-.021 4.947-.082c1.28-.06 2.147-.265 2.91-.563a5.9 5.9 0 0 0 2.123-1.388 5.9 5.9 0 0 0 1.38-2.129c.295-.763.496-1.636.551-2.912.056-1.28.07-1.69.063-4.948-.006-3.258-.02-3.667-.081-4.947-.06-1.28-.264-2.148-.564-2.911a5.9 5.9 0 0 0-1.387-2.123 5.9 5.9 0 0 0-2.128-1.38c-.764-.294-1.636-.496-2.914-.55C15.647.009 15.236-.006 11.977 0S8.31.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408a3.7 3.7 0 0 1-1.382-.895 3.7 3.7 0 0 1-.9-1.378c-.165-.423-.363-1.058-.417-2.228-.06-1.264-.072-1.644-.08-4.848-.006-3.204.006-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.477-.96.895-1.382a3.7 3.7 0 0 1 1.379-.9c.423-.165 1.057-.361 2.227-.417 1.265-.06 1.644-.072 4.848-.08 3.203-.006 3.583.006 4.85.062 1.168.05 1.804.244 2.227.408.56.216.96.475 1.382.895s.681.817.9 1.378c.165.422.362 1.056.417 2.227.06 1.265.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.805-.408 2.23-.216.56-.477.96-.896 1.38a3.7 3.7 0 0 1-1.378.9c-.422.165-1.058.362-2.226.418-1.266.06-1.645.072-4.85.079s-3.582-.006-4.848-.06m9.783-16.192a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012a6.161 6.161 0 1 0 12.323-.024 6.162 6.162 0 0 0-12.323.024M8 12.008A4 4 0 1 1 12.008 16 4 4 0 0 1 8 12.008"/></svg></a>
      <a href="https://dribbble.com/" rel="noopener" aria-label="Dribbble"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12m10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308a10.28 10.28 0 0 0 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4a10.16 10.16 0 0 0 6.29 2.166c1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765q.202-.067.405-.12-.392-.879-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248a66 66 0 0 0-3.8-5.928 10.28 10.28 0 0 0-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702A10.2 10.2 0 0 0 12 1.764c-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/></svg></a>
      <a href="mailto:your@email.com" aria-label="Email"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></a>
    </nav>`.trim();

function renderPage(p) {
  var title = p.name + " – Svetla Bardarova";
  var desc = p.desc || p.headline || p.name;
  var ogImage = absUrl(p.cover);
  var ogUrl = SITE_ORIGIN + "/" + p.slug + "/";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(desc)}">
<meta property="og:title" content="${escapeAttr(p.name)}">
<meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:image" content="${escapeAttr(ogImage)}">
<meta property="og:url" content="${escapeAttr(ogUrl)}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${escapeAttr(ogUrl)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.css">
<link rel="stylesheet" href="../site.css?v=nav-burger-48">
</head>
<body class="case-open">
<nav class="case-nav" id="case-nav" aria-label="Case study">
  <a class="home case-nav-blend" href="../" aria-label="Home">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/></svg>
  </a>
  <div class="case-nav-end">
    <button type="button" class="case-nav-toggle" aria-expanded="false" aria-controls="case-nav-panel" aria-label="Open menu">
      <span class="case-nav-toggle-bars" aria-hidden="true"></span>
    </button>
    <div class="case-nav-panel" id="case-nav-panel">
      ${SOCIALS}
      <a class="resume case-nav-blend" href="#" aria-label="Resume">Resume</a>
    </div>
  </div>
</nav>
<article id="case">
${renderCaseBody(p)}
</article>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js"></script>
<script src="../case-enhance.js?v=nav-burger-48"></script>
</body>
</html>
`;
}

if (!PROJECTS.length) {
  console.error("No projects found in projects-data.js");
  process.exit(1);
}

for (const p of PROJECTS) {
  const dir = path.join(ROOT, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "index.html");
  fs.writeFileSync(out, renderPage(p), "utf8");
  console.log("wrote", path.relative(ROOT, out));
}

console.log("Built", PROJECTS.length, "case pages.");
