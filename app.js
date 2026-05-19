const API_BASE = "https://api.github.com";
const GITHUB_PAGE_SIZE = 100;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

async function loadConfig() {
  const res = await fetch("./repos.json");
  if (!res.ok) throw new Error(`repos.json: HTTP ${res.status}`);
  return res.json();
}

async function fetchAllRepos(owner) {
  const res = await fetch(
    `${API_BASE}/users/${owner}/repos?per_page=${GITHUB_PAGE_SIZE}&sort=pushed`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub API: HTTP ${res.status}`);
  const repos = await res.json();
  if (repos.length >= GITHUB_PAGE_SIZE) {
    console.warn("GitHub API: page size limit hit; some repos may be missing from enrichment.");
  }
  return repos;
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

function renderIntro(intro) {
  document.querySelector(".brand").textContent = intro.name;

  const nav = document.querySelector(".masthead .links");
  nav.replaceChildren(
    ...intro.links.map(l => el("a", { href: l.url }, l.label))
  );

  document.querySelector("#intro-heading").textContent = intro.tagline;
}

function siteLinkLabel(p, owner) {
  if (p.site) return p.site.replace(/^https?:\/\//, "");
  return `github.com/${owner}/${p.repo}`;
}

function buildCard(p, owner, i) {
  const href = p.site || `https://github.com/${owner}/${p.repo}`;
  return el("article", {
    class: "project-card",
    dataset: { repo: p.repo },
    style: { "--i": String(i) },
  }, [
    el("h3", { class: "card-title" }, p.title),
    el("p",  { class: "card-tagline" }, p.tagline),
    el("p",  { class: "card-meta" }, [
      el("span", { class: "meta-stars" }),
      el("span", { class: "meta-lang" }),
      el("span", { class: "meta-date" }),
    ]),
    el("ul", { class: "card-tags" },
      (p.tags || []).map(t => el("li", { class: "tag" }, t))
    ),
    el("a", { class: "card-link", href }, `${siteLinkLabel(p, owner)} →`),
  ]);
}

function renderCards(projects, owner) {
  document.querySelector(".count").textContent =
    `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  document.querySelector(".project-grid").replaceChildren(
    ...projects.map((p, i) => el("li", { class: "project-card-wrap" }, buildCard(p, owner, i)))
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

function enrichCards(allRepos) {
  const byName = new Map(allRepos.map(r => [r.name, r]));
  for (const card of document.querySelectorAll(".project-card")) {
    const repo = byName.get(card.dataset.repo);
    if (!repo) continue;
    card.querySelector(".meta-stars").textContent = `★ ${repo.stargazers_count ?? 0}`;
    card.querySelector(".meta-lang").textContent  = repo.language || "—";
    card.querySelector(".meta-date").textContent  = relativeDate(repo.pushed_at);
    card.classList.add("has-live-data");
  }
}

(async function init() {
  let cfg;
  try {
    cfg = await loadConfig();
  } catch (err) {
    console.error("Portfolio init failed:", err);
    return;
  }
  renderIntro(cfg.intro);
  renderCards(cfg.projects, cfg.owner);
  try {
    const all = await fetchAllRepos(cfg.owner);
    enrichCards(all);
  } catch (err) {
    console.warn("GitHub API enrichment skipped:", err);
  }
})();
