const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== Starfield ===== */
const cv = document.getElementById("stars"), ctx = cv.getContext("2d");
let stars = [];
function resize() {
  cv.width = innerWidth; cv.height = innerHeight;
  const n = Math.min(180, Math.floor(innerWidth * innerHeight / 9000));
  stars = Array.from({ length: n }, () => ({
    x: Math.random() * cv.width, y: Math.random() * cv.height,
    r: Math.random() * 1.4 + .3, p: Math.random() * Math.PI * 2,
    s: .4 + Math.random() * .9, d: .02 + Math.random() * .06
  }));
}
function draw(time) {
  ctx.clearRect(0, 0, cv.width, cv.height);
  const light = root.dataset.theme === "light";
  for (const st of stars) {
    ctx.globalAlpha = Math.max(0, light ? .18 : .3 + Math.sin(time / 1000 * st.s + st.p) * .28);
    ctx.fillStyle = light ? "#55555f" : "#fff";
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
    st.y -= st.d; if (st.y < -2) st.y = cv.height + 2;
  }
  ctx.globalAlpha = 1;
  if (!reduced) requestAnimationFrame(draw);
}
resize(); addEventListener("resize", resize); requestAnimationFrame(draw);
if (reduced) document.querySelector(".ecg-strip svg").pauseAnimations();

/* ===== Projects + experience from data/*.json ===== */
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const link = (href, label, cls) => {
  const a = el("a", cls, label);
  a.href = href; a.target = "_blank"; a.rel = "noopener";
  return a;
};
const get = (path) => fetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null);

Promise.all([get("data/projects.json"), get("data/experience.json"), get("data/overrides.json")]).then(([projects, exp, ov]) => {
  ov = ov || {};

  const SPEC = ["red", "orange", "yellow", "green", "blue", "violet"];
  const color = (i) => `var(--${SPEC[i % 6]})`;

  function renderProjects() {
    const list = document.getElementById("projectList");
    list.replaceChildren(...(projects || []).map((p, i) => {
      const o = ov[p.name] || {};
      const title = o.title || p.name;
      const desc = (lang() === "es" && o.description_es) || p.description || "";
      const card = el("article", "project-card");
      card.style.setProperty("--c", color(i));
      const visual = el("div", "project-visual");
      const set = (p.images && (p.images[lang()] || p.images.en)) || {};
      const src = set[root.dataset.theme] || set.light;
      if (src) {
        const img = el("img");
        img.src = src; img.alt = `${title}: ${t("proj.result")}`; img.loading = "lazy";
        visual.append(img);
      } else {
        const con = el("div", "visual-console");
        const head = el("div", "console-heading");
        head.append(el("span", null, p.name.toUpperCase().slice(0, 22)), el("span", null, new Date(p.pushedAt).toISOString().slice(0, 10)));
        const spec = el("div", "console-spectrum");
        for (let k = 0; k < 7; k++) spec.append(el("span"));
        con.append(head, spec);
        [["lang", p.language || "—"], ["repo", p.url.replace("https://github.com/", "")], ["topics", String(p.topics.length)],
         ...((p.homepage || o.homepage) ? [["demo", new URL(p.homepage || o.homepage).host]] : [])]
          .forEach(([k, v], n) => con.append(el("p", "terminal-line" + (n === 0 ? " active" : ""), `${k}: ${v}`)));
        visual.append(con);
      }

      const content = el("div", "project-content");
      const top = el("div");
      top.append(
        el("p", "project-number", `${t("proj.label")} ${String(i + 1).padStart(2, "0")}${(o.category || p.language) ? " · " + (o.category || p.language) : ""}`),
        el("h3", "project-title", title),
        el("p", "project-description", desc)
      );
      const bottom = el("div");
      const tags = el("div", "project-tags");
      p.topics.slice(0, 5).forEach((tp) => tags.append(el("span", "tag", tp)));
      const actions = el("div", "project-tags");
      actions.append(link(p.url, t("proj.code"), "button button-secondary"));
      if (p.homepage || o.homepage) actions.append(link(p.homepage || o.homepage, t("proj.demo"), "button button-primary"));
      actions.style.marginTop = "var(--s5)";
      bottom.append(tags, actions);
      content.append(top, bottom);

      card.append(visual, content);
      return card;
    }));
  }

  const fmt = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(lang(), { month: "short", year: "numeric" }).format(new Date(y, m - 1));
  };

  function renderExperience() {
    const tl = document.getElementById("timeline");
    tl.replaceChildren(...(exp ? exp.roles : []).map((r, i) => {
      const item = el("article", "timeline-item");
      item.style.setProperty("--c", color(i));
      item.append(el("p", "timeline-period", `${fmt(r.start)} – ${r.end ? fmt(r.end) : t("exp.present")}`));
      const body = el("div");
      body.append(el("h3", null, r.title[lang()]), el("span", "timeline-company", r.company));
      if (r.summary) body.append(el("p", null, r.summary[lang()]));
      item.append(body);
      return item;
    }));
  }

  const render = () => { renderProjects(); renderExperience(); };
  render();
  addEventListener("langchange", render);
  addEventListener("themechange", renderProjects);
});
