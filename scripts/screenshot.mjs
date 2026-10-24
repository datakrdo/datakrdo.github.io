// Usage: node screenshot.mjs <url> <width> <height> <wait-ms> <out.png> [light|dark] [css-selector-to-scroll-to]
// Real-time wait (not virtual time) so client-side charts have time to render.
import { spawn } from "node:child_process";
import fs from "node:fs";
const [, , url, W, H, wait, out, scheme = "light", selector = ""] = process.argv;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(250); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
await send("Page.navigate", { url });
await sleep(+wait);
if (selector) {
  // charts below the fold render lazily: scroll to the target, leave a little context above it
  await send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView(); scrollBy(0, -80)` });
  await sleep(6000);
}
fs.writeFileSync(out, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
ws.close(); chrome.kill();
