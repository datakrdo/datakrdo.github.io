// Run: node analytics/worker.test.mjs  (fake D1 and rate limiter, no network)
import assert from "node:assert/strict";
import worker from "./worker.js";

const run = (events, { headers = {}, rl = true } = {}) => {
  const rows = [];
  const env = {
    RL: { limit: async () => ({ success: rl }) },
    DB: { prepare: (sql) => ({ bind: (...a) => ({ sql, a, run: async () => rows.push({ sql, a }) }) }), batch: async (r) => rows.push(...r) },
  };
  const req = new Request("https://w.test/", { method: "POST", headers: { Origin: "https://datakrdo.github.io", ...headers }, body: JSON.stringify({ vid: "v", events }) });
  return worker.fetch(req, env).then((res) => ({ res, rows, env }));
};
const now = Date.now();

let t = await run([{ ts: now, type: "view" }, { ts: now, type: "bogus" }]);
assert.equal(t.res.status, 204); assert.equal(t.rows.length, 1, "unknown event type must not be stored");

t = await run([{ ts: now - 5 * 864e5, type: "view" }]);
assert.ok(Math.abs(t.rows[0].a[0] - now) < 5000, "a ts more than a day off is replaced by server time");

t = await run(Array.from({ length: 25 }, () => ({ ts: now, type: "view" })));
assert.equal(t.rows.length, 10, "at most 10 events per request");

t = await run([{ ts: now, type: "view", props: { x: "a".repeat(2000) } }]);
assert.equal(t.rows[0].a[5], "{}", "oversized props become {} instead of broken JSON");

t = await run([{ ts: now, type: "view" }], { rl: false });
assert.equal(t.res.status, 429);

t = await run([{ ts: now, type: "view" }], { headers: { Origin: "https://evil.example" } });
assert.equal(t.res.status, 403);

const del = []; const env = { DB: { prepare: (sql) => ({ bind: (c) => ({ run: async () => del.push({ sql, c }) }) }) } };
await worker.scheduled({}, env);
assert.match(del[0].sql, /DELETE FROM events WHERE ts </);
assert.ok(Math.abs(del[0].c - (Date.now() - 365 * 864e5)) < 5000, "retention cutoff is 365 days");
console.log("worker tests ok");
