// Receives batches of site events and stores them in D1. Cloudflare adds the network (org/asn) and place for free via request.cf.
const ORIGINS = ["https://datakrdo.github.io", "http://localhost:8000"];
const COLS = "ts,vid,sid,type,name,props,path,hash,referrer,utm,lang,theme,vw,vh,ua,country,region,city,tz,asn,org,bot".split(",");
const s = (v, n = 300) => (v == null ? null : String(v).slice(0, n));

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin");
    if (req.method !== "POST" || !ORIGINS.includes(origin)) return new Response(null, { status: 403 });
    const raw = await req.text();
    if (raw.length > 16384) return new Response(null, { status: 413 });
    let b;
    try { b = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    const cf = req.cf || {}, ua = req.headers.get("User-Agent") || "";
    const bot = +(b.wd === true || /bot|crawl|spider|headless|preview|slurp|facebookexternalhit/i.test(ua));
    const now = Date.now(); // a client clock more than a day off (or a forged ts) is replaced by the server time
    const q = env.DB.prepare(`INSERT INTO events (${COLS}) VALUES (${COLS.map(() => "?").join(",")})`);
    const rows = (Array.isArray(b.events) ? b.events.slice(0, 30) : []).map((e) =>
      q.bind(Math.abs(Number(e.ts) - now) < 864e5 ? Number(e.ts) : now, s(b.vid, 40), s(b.sid, 40), s(e.type, 30), s(e.name, 120), s(JSON.stringify(e.props ?? {}), 1000),
        s(b.path), s(b.hash), s(b.referrer, 500), s(JSON.stringify(b.utm ?? {}), 500), s(b.lang, 5), s(b.theme, 5),
        Number(b.vw) || null, Number(b.vh) || null, s(ua, 300), s(cf.country, 5), s(cf.region), s(cf.city), s(cf.timezone), Number(cf.asn) || null, s(cf.asOrganization), bot));
    if (rows.length) await env.DB.batch(rows);
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin } });
  },
};
