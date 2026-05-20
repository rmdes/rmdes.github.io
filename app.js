const API_BASE = "https://api.github.com";
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const REPO_PAGE_SIZE = 100;
const REPO_MAX_PAGES = 10;

// Octicon repo (16) — embedded so we don't need a network fetch for an icon.
const REPO_ICON_PATH =
  "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z";
// Octicon link-external (16)
const EXTERNAL_LINK_PATH =
  "M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z";

async function loadConfig() {
  const res = await fetch("./repos.json");
  if (!res.ok) throw new Error(`repos.json: HTTP ${res.status}`);
  return res.json();
}

async function fetchAllRepos(owner) {
  const byName = new Map();
  for (let page = 1; page <= REPO_MAX_PAGES; page++) {
    const res = await fetch(
      `${API_BASE}/users/${owner}/repos?per_page=${REPO_PAGE_SIZE}&page=${page}&sort=full_name`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) throw new Error(`GitHub API: HTTP ${res.status} on page ${page}`);
    const repos = await res.json();
    for (const r of repos) byName.set(r.name, r);
    if (repos.length < REPO_PAGE_SIZE) break;
  }
  return byName;
}

// Small DOM-builder helper. All text content goes through textContent —
// no innerHTML anywhere in this file, so untrusted values can never be
// interpreted as HTML.
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k === "style") {
      for (const [sk, sv] of Object.entries(v)) node.style.setProperty(sk, sv);
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function svg(d, klass) {
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", "0 0 16 16");
  s.setAttribute("fill", "currentColor");
  s.setAttribute("aria-hidden", "true");
  if (klass) s.setAttribute("class", klass);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  s.appendChild(path);
  return s;
}

function renderIntro(intro) {
  document.querySelector(".brand").textContent = intro.name;

  const leftNav = document.querySelector(".masthead .left-links");
  if (leftNav) {
    leftNav.replaceChildren(
      ...(intro.left_links || []).map(l => el("a", { href: l.url }, l.label))
    );
  }

  const nav = document.querySelector(".masthead .links");
  nav.replaceChildren(
    ...intro.links.map(l => el("a", { href: l.url }, l.label))
  );

  document.querySelector("#intro-heading").textContent = intro.tagline;
}

function langClassFor(language) {
  if (!language) return "lang-unknown";
  return "lang-" + language.replace(/\+/g, "p").replace(/[^A-Za-z0-9-]/g, "");
}

function buildCard(p, owner) {
  const href = p.site || `https://github.com/${owner}/${p.repo}`;
  const repoUrl = `https://github.com/${owner}/${p.repo}`;
  const title = el("a", { href }, p.title);

  return el("article", {
    class: "project-card",
    dataset: { repo: p.repo },
  }, [
    el("h3", { class: "card-title" }, [
      svg(REPO_ICON_PATH, "repo-icon"),
      title,
    ]),
    p.tagline ? el("p", { class: "card-tagline" }, p.tagline) : null,
    el("p", { class: "card-meta" }, [
      el("span", { class: "meta-stars" }),
      el("span", { class: "meta-lang" }, [
        el("span", { class: "lang-dot" }),
        el("span", { class: "lang-name" }),
      ]),
      el("span", { class: "meta-date" }),
    ]),
    (p.tags && p.tags.length)
      ? el("ul", { class: "card-tags" },
          p.tags.map(t => el("li", { class: "tag" }, t)))
      : null,
    el("a", { class: "card-link", href: repoUrl }, [
      `github.com/${owner}/${p.repo}`,
      svg(EXTERNAL_LINK_PATH, "external-link"),
    ]),
  ]);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderSection(section, owner) {
  const slug = slugify(section.title);
  const headingId = `sect-${slug}`;
  return el("section", { class: "project-section", "aria-labelledby": headingId }, [
    el("header", { class: "section-label" }, [
      el("h2", { id: headingId }, section.title),
      el("span", { class: "count" }, String(section.projects.length)),
    ]),
    el("ul", { class: "project-grid" },
      section.projects.map(p =>
        el("li", { class: "project-card-wrap" }, buildCard(p, owner))
      )
    ),
  ]);
}

function renderSections(sections, owner) {
  document.querySelector(".project-sections").replaceChildren(
    ...sections.map(s => renderSection(s, owner))
  );
}

function relativeDate(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.floor((Date.now() - then) / MS_PER_DAY);
  if (days < 1)                return "today";
  if (days < DAYS_PER_WEEK)    return `${days}d ago`;
  if (days < DAYS_PER_MONTH)   return `${Math.floor(days / DAYS_PER_WEEK)}w ago`;
  if (days < DAYS_PER_YEAR)    return `${Math.floor(days / DAYS_PER_MONTH)}mo ago`;
  return `${Math.floor(days / DAYS_PER_YEAR)}y ago`;
}

function enrichCards(byName) {
  for (const card of document.querySelectorAll(".project-card")) {
    const repo = byName.get(card.dataset.repo);
    if (!repo) continue;

    card.querySelector(".meta-stars").textContent = `★ ${repo.stargazers_count ?? 0}`;

    const langWrap = card.querySelector(".meta-lang");
    const langName = repo.language || "—";
    langWrap.classList.add(langClassFor(repo.language));
    langWrap.querySelector(".lang-name").textContent = langName;

    card.querySelector(".meta-date").textContent = relativeDate(repo.pushed_at);
    card.classList.add("has-live-data");
  }
}

// Theme toggle: respects OS prefers-color-scheme by default; click flips between
// explicit light/dark which is persisted to localStorage.
function initThemeToggle() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme
      || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (_) {}
  });
}

(async function init() {
  initThemeToggle();
  let cfg;
  try {
    cfg = await loadConfig();
  } catch (err) {
    console.error("Portfolio init failed:", err);
    return;
  }
  renderIntro(cfg.intro);
  renderSections(cfg.sections, cfg.owner);
  try {
    const byName = await fetchAllRepos(cfg.owner);
    enrichCards(byName);
  } catch (err) {
    console.warn("GitHub API enrichment skipped:", err);
  }
})();
