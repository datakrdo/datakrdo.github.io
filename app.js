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

  /* ----- filters, case viewer, related projects ----- */
  const TYPES = ["bi", "pipelines", "ml", "geo"], SECTORS = ["health", "agro", "sports", "finance", "music"];
  const GENERIC = ["python", "uv", "github-actions", "github-pages", "open-data"]; // too common to say two projects are related
  const filter = { type: null, sector: null };
  let cards = [], openName = null;
  const fl = (o) => o.filters || {};
  const matches = (o, f) => (!f.type || (fl(o).type || []).includes(f.type)) && (!f.sector || fl(o).sector === f.sector);
  const withTransition = (fn) => (document.startViewTransition && !reduced ? document.startViewTransition(fn) : fn());

  function renderFilters() {
    const box = document.getElementById("projectFilters");
    if (!box) return;
    const row = (group, vals) => {
      const r = el("div", "filter-row");
      r.append(el("span", "filter-label", t("flt." + group)));
      vals.filter((v) => cards.some((c) => matches(c.o, { [group]: v }))).forEach((v) => {
        const b = el("button", "chip-btn", t("flt." + v));
        b.type = "button"; b.dataset.group = group; b.dataset.v = v;
        b.addEventListener("click", () => { filter[group] = filter[group] === v ? null : v; applyFilter(); });
        r.append(b);
      });
      return r;
    };
    const all = el("button", "chip-btn chip-all", t("flt.all"));
    all.type = "button";
    all.addEventListener("click", () => { filter.type = filter.sector = null; applyFilter(); });
    const count = el("p", "filter-count"); count.id = "filterCount"; count.setAttribute("aria-live", "polite");
    box.replaceChildren(all, row("type", TYPES), row("sector", SECTORS), count);
  }

  function applyFilter(animate = true) {
    const run = () => {
      let n = 0;
      cards.forEach((c) => { const ok = matches(c.o, filter); c.el.hidden = !ok; if (ok) n++; });
      const count = document.getElementById("filterCount"), empty = document.getElementById("projectEmpty");
      if (count) { count.textContent = `${n} ${t("flt.of")} ${cards.length}`; count.classList.remove("beat"); void count.offsetWidth; count.classList.add("beat"); }
      if (empty) { empty.hidden = n > 0; empty.textContent = t("flt.empty"); }
      document.querySelectorAll("#projectFilters .chip-btn").forEach((b) => {
        const g = b.dataset.group;
        const on = g ? filter[g] === b.dataset.v : !filter.type && !filter.sector;
        b.setAttribute("aria-pressed", on);
        b.disabled = !!g && !on && !cards.some((c) => matches(c.o, { ...filter, [g]: b.dataset.v }));
      });
    };
    animate ? withTransition(run) : run();
  }

  function demoFrame(url, title) {
    const box = el("div", "case-demo"), frame = el("div", "case-frame"), f = el("iframe");
    f.src = url; f.title = `${title}: demo`; f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    frame.append(f);
    box.append(frame, link(url, t("case.demo") + " ↗"));
    new ResizeObserver(() => { f.style.transform = `scale(${frame.clientWidth / 1280})`; }).observe(frame); // render at desktop width, scaled to fit
    return box;
  }

  let lightbox;
  function zoom(s) {
    if (!lightbox) {
      lightbox = el("dialog", "lightbox");
      const x = el("button", "lb-close", "×"); x.type = "button"; x.setAttribute("aria-label", t("gal.close"));
      x.addEventListener("click", () => lightbox.close());
      lightbox.append(x, el("img"), el("p"));
      lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
      document.body.append(lightbox);
    }
    lightbox.querySelector("img").src = s.src; lightbox.querySelector("img").alt = s.caption;
    lightbox.querySelector("p").textContent = s.caption;
    lightbox.showModal();
  }

  function slidesFor(p, title, demo) {
    const L = lang(), th = root.dataset.theme, out = [];
    const main = (p.images && (p.images[L] || p.images.en)) || {};
    if (main[th] || main.light) out.push({ src: main[th] || main.light, caption: `${title}: ${t("proj.result")}` });
    ((p.gallery && (p.gallery[L] || p.gallery.en)) || []).forEach((g) => out.push({ src: g[th] || g.light, caption: g.caption }));
    if (demo) out.push({ demo });
    return out;
  }

  function buildViewer(slides, title) {
    const v = el("div", "viewer");
    v.tabIndex = 0; v.setAttribute("role", "group"); v.setAttribute("aria-roledescription", "carousel"); v.setAttribute("aria-label", title);
    const wrap = el("div", "stage-wrap"), stage = el("div", "stage"), cap = el("p", "stage-caption"), thumbs = el("div", "thumbs");
    cap.setAttribute("aria-live", "polite");
    let cur = 0, demo;
    const show = (n) => {
      cur = (n + slides.length) % slides.length;
      const s = slides[cur];
      const paint = () => {
        if (s.demo) stage.replaceChildren(demo || (demo = demoFrame(s.demo, title)));
        else {
          const b = el("button", "stage-img"), img = el("img");
          b.type = "button"; b.setAttribute("aria-label", t("gal.zoom"));
          img.src = s.src; img.alt = s.caption; b.append(img);
          b.addEventListener("click", () => zoom(s));
          stage.replaceChildren(b);
        }
        cap.textContent = s.demo ? `${title}: ${t("gal.demo")}` : s.caption;
        [...thumbs.children].forEach((b, k) => b.setAttribute("aria-pressed", k === cur));
        stage.classList.remove("out");
      };
      if (reduced || !stage.firstChild) paint(); else { stage.classList.add("out"); setTimeout(paint, 140); }
    };
    slides.forEach((s, k) => {
      const b = el("button", "thumb");
      b.type = "button"; b.setAttribute("aria-label", s.demo ? t("gal.demo") : s.caption);
      if (s.demo) b.append(el("span", null, t("gal.demo")));
      else { const im = el("img"); im.src = s.src; im.alt = ""; im.loading = "lazy"; b.append(im); }
      b.addEventListener("click", () => show(k));
      thumbs.append(b);
    });
    wrap.append(stage);
    if (slides.length > 1) {
      [["prev", -1], ["next", 1]].forEach(([k, d]) => {
        const b = el("button", "stage-nav " + k); b.type = "button"; b.setAttribute("aria-label", t("gal." + k));
        b.addEventListener("click", () => show(cur + d));
        wrap.append(b);
      });
      v.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); show(cur + (e.key === "ArrowRight" ? 1 : -1)); }
      });
    }
    v.append(wrap, cap);
    if (slides.length > 1) v.append(thumbs);
    show(0);
    return v;
  }

  function related(p) {
    const f = fl(ov[p.name] || {}), mine = p.topics.filter((x) => !GENERIC.includes(x));
    return (projects || []).filter((q) => q.name !== p.name).map((q) => {
      const g = fl(ov[q.name] || {}), theirs = q.topics.filter((x) => !GENERIC.includes(x));
      const shared = theirs.filter((x) => mine.includes(x));
      const types = (g.type || []).filter((x) => (f.type || []).includes(x));
      const sector = f.sector && g.sector === f.sector;
      const score = shared.length / new Set([...mine, ...theirs]).size + types.length + (sector ? 1 : 0);
      return { q, score, why: [...(sector ? [t("flt." + g.sector)] : []), ...types.map((x) => t("flt." + x)), ...shared.slice(0, 2)] };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  }

  function openCase(name, scroll = true) {
    const c = cards.find((x) => x.p.name === name), d = c && c.el.querySelector(".case");
    if (!d) return;
    if (c.el.hidden) { filter.type = filter.sector = null; applyFilter(false); }
    d.open = true;
    if (scroll) setTimeout(() => {
      c.el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      c.el.classList.add("flash");
      c.el.addEventListener("animationend", () => c.el.classList.remove("flash"), { once: true });
    }, 60);
  }

  function caseDetails(card, p, title, cs, demo) {
    const d = el("details", "case");
    d.append(el("summary", null, t("case.open")));
    const body = el("div", "case-body");
    [["problem", cs.problem], ["approach", cs.approach], ["result", cs.result]].forEach(([k, v]) => {
      const item = el("div", "case-item");
      item.append(el("h4", null, t("case." + k)), el("p", null, v));
      body.append(item);
    });
    if (cs.details && cs.details.length) {
      const more = el("details", "more"), ul = el("ul");
      more.append(el("summary", null, t("case.more")));
      cs.details.forEach((x) => ul.append(el("li", null, x)));
      more.append(ul); body.append(more);
    }
    const links = el("div", "case-links"), site = p.homepage || (ov[p.name] || {}).homepage;
    links.append(link(p.url, t("proj.code"), "button button-secondary"));
    if (site) links.append(link(site, t("proj.demo"), "button button-primary"));
    body.insertBefore(links, body.querySelector(".more"));
    const rel = related(p);
    if (rel.length) {
      const box = el("div", "related");
      box.append(el("h4", null, t("rel.title")));
      rel.forEach((r) => {
        const b = el("button", "related-item");
        b.type = "button";
        b.append(el("strong", null, (ov[r.q.name] || {}).title || r.q.name), el("span", null, `${t("rel.share")}: ${r.why.join(" · ")}`));
        b.addEventListener("click", () => openCase(r.q.name));
        box.append(b);
      });
      body.append(box);
    }
    d.append(body);
    d.addEventListener("toggle", () => {
      if (d.open) {
        cards.forEach((c) => { const x = c.el.querySelector(".case"); if (x && x !== d && x.open) x.open = false; });
        if (!card.querySelector(".viewer")) { const slides = slidesFor(p, title, demo); if (slides.length) card.append(buildViewer(slides, title)); }
        openName = p.name; history.replaceState(null, "", "#caso-" + p.name);
      } else if (openName === p.name) {
        openName = null;
        if (location.hash === "#caso-" + p.name) history.replaceState(null, "", location.pathname + location.search);
      }
    });
    return d;
  }

  function renderProjects() {
    const list = document.getElementById("projectList");
    cards = [];
    list.replaceChildren(...(projects || []).map((p, i) => {
      const o = ov[p.name] || {};
      const title = o.title || p.name;
      const desc = (lang() === "es" && o.description_es) || o.description || p.description || "";
      const card = el("article", "project-card");
      card.style.setProperty("--c", color(i));
      card.style.viewTransitionName = `card-${i}`; card.dataset.name = p.name;
      cards.push({ el: card, p, o });
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
        [["lang", p.language || "—"], ["repo", p.url.replace("https://github.com/", "")],
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
      content.append(top);

      card.append(visual, content);
      const cs = (lang() === "es" && o.case_es) || o.case;
      if (cs) card.append(caseDetails(card, p, title, cs, o.demo || p.homepage || o.homepage));
      return card;
    }));
    renderFilters(); applyFilter(false);
    if (openName) { const keep = openName; openName = null; openCase(keep, false); } // survive a language or theme re-render
  }

  const fmt = (ym) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(lang(), { month: "short", year: "numeric" }).format(new Date(y, m - 1));
  };

  function renderExperience() {
    const roles = exp ? exp.roles : [];
    const marquee = document.getElementById("logoMarquee"), card = document.getElementById("expCard");
    if (!marquee) return;
    const show = (r, i) => {
      card.style.setProperty("--c", color(i));
      card.replaceChildren(
        el("p", "timeline-period", `${fmt(r.start)} – ${r.end ? fmt(r.end) : t("exp.present")}`),
        el("h3", null, `${r.title[lang()]} · ${r.company}`),
        ...(r.summary ? [el("p", null, r.summary[lang()])] : [])
      );
    };
    const group = (hidden) => {
      const g = el("div", "logo-group");
      if (hidden) g.setAttribute("aria-hidden", "true");
      roles.forEach((r, i) => (r.logos && r.logos.length ? r.logos : [{ name: r.company }]).forEach((lg) => {
        const b = el("button", "logo-item");
        b.type = "button"; b.style.setProperty("--c", color(i));
        if (hidden) b.tabIndex = -1; else b.setAttribute("aria-label", `${lg.name}: ${r.title[lang()]}`);
        if (lg.file) {
          const m = el("span", "logo-mask"), img = el("img");
          img.src = `data/logos/${lg.file}`; img.alt = "";
          m.style.setProperty("--m", `url(data/logos/${lg.file})`);
          m.append(img); b.append(m);
        } else b.append(el("span", "logo-word", lg.name));
        const on = () => { show(r, i); [...document.querySelectorAll(".logo-item")].forEach((x) => x.setAttribute("aria-pressed", x === b)); };
        b.addEventListener("mouseenter", on); b.addEventListener("focus", on); b.addEventListener("click", on);
        g.append(b);
      }));
      return g;
    };
    const track = el("div", "logo-track");
    track.append(group(false), group(true));
    marquee.replaceChildren(track);
    if (roles.length) show(roles[0], 0);
  }

  const render = () => { renderProjects(); renderExperience(); };
  render();
  if (location.hash.startsWith("#caso-")) openCase(location.hash.slice(6)); // deep link to one case
  addEventListener("langchange", render);
  addEventListener("themechange", renderProjects);
});

/* ===== Proof years, contact form, reveal ===== */
const yrs = document.getElementById("proofYears");
if (yrs) yrs.textContent = Math.floor((Date.now() - new Date(2021, 9)) / 31557600000) + "+"; // since the first role (Oct 2021)
const form = document.getElementById("contactForm");
if (form && !form.action.includes("FORM_ID")) form.hidden = false; // shown only once a real Formspree id is set
if (form) form.addEventListener("submit", async (e) => {
  e.preventDefault(); // stay on the site: Formspree answers JSON when asked for it, on the free plan too
  const btn = form.querySelector("[type=submit]"), status = document.getElementById("formStatus");
  const say = (key, state) => { status.dataset.key = key; status.dataset.state = state; status.textContent = t(key); status.hidden = false; };
  btn.disabled = true; say("f.sending", "wait");
  try {
    const r = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    if (r.ok) { form.reset(); say("f.ok", "ok"); } else say("f.err", "err");
  } catch { say("f.err", "err"); }
  btn.disabled = false;
});
addEventListener("langchange", () => { const s = document.getElementById("formStatus"); if (s && s.dataset.key) s.textContent = t(s.dataset.key); });
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.08 });
  document.querySelectorAll(".section,.intro-strip-inner,.gatefold-inner").forEach((n) => { n.classList.add("reveal"); io.observe(n); });
}
