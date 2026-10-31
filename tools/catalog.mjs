// The HyperFrames catalog (HeyGen, Apache-2.0) as a design library: blocks and components to port into Remotion.
// The engine stays Remotion; nothing here is imported by a reel. A piece we like is rebuilt in src/shared/ui/ (or a
// reel's graphics.tsx) from its source, with a credit line.
//   npm run catalog            -> catalog/hyperframes/src (the registry at the pinned commit) and
//                                 catalog/hyperframes/index.html (the gallery: our picks first, then everything)
// Previews (posters, clips) load from HeyGen's CDN, so the gallery needs the internet.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = "https://github.com/heygen-com/hyperframes.git";
const COMMIT = "5472d9eac0cf47ee89bd38495a09efad9984d5ab"; // 2026-10-26
const out = path.resolve("catalog/hyperframes");
const src = path.join(out, "src");

// What fits our reels, by the layout it would serve (docs/style.md). `ported` names our component once built.
const PICKS = {
  "App screens (split, graphic)": {
    "touch-indicator": "Taps, swipes and long-presses on phone UI; more gestures than our Tap",
    "cursor-zoom-follow": "Screen-recording auto-zoom toward each click: for desktop app recordings",
    "ui-focus-zoom": "An app screen settles, then the camera zooms and pans to the part being named",
    "yt-feather-highlight": "Dims a screenshot except one soft ellipse: the field or button being named",
    "cursor-annotate": "A marker loop, underline or arrow drawn onto a screenshot",
    "screen-flow-carousel": "Two to five app screens on a rail, the current one in front",
    "device-frame-stage": "A phone or tablet frame around a screenshot or recording",
    "browser-device-stage": "Browser, window or phone chrome around an app surface",
    "sheet-spring-up": "A bottom sheet springing up, sampled from a real spring",
  },
  "Phone flows (graphic, vertical)": {
    "notification-cascade": "Notifications landing and stacking up a phone screen",
    "message-thread-reveal": "A text conversation playing out: bubbles, typing dots",
    "chatgpt-exchange": "A ChatGPT-style prompt and streamed answer, for AI app reviews",
    "claude-exchange": "A Claude-style prompt with search and reasoning steps",
    "notes-reveal": "A note typed into a notes app, caret on every letter",
  },
  "Proof (the name and one number)": {
    "number-wheel": "Rolling digits for stars, users, downloads",
    "star-rating-fill": "A star row filling to a fractional rating (4.6 on the Play Store)",
    "conic-progress-ring": "A ring filling with the count in the middle",
    "chart-story": "One chart (bars, line, donut) building in reading order",
  },
  "Compare (but here's the difference)": {
    "before-after-wipe": "Two states, a divider wiping between them",
    "split-tilt-cards": "Two cards opening like a book: this app vs that one",
  },
  "Developer apps": {
    "code-typing": "Code typing in token by token with a caret",
    "code-diff": "An edit as a diff: red lines collapse, green expand",
    "code-terminal-run": "A terminal runs one command and prints the result",
  },
  "End card (CTA)": {
    "cta-lockup": "Action line, accent capsule, lockup",
    "social-proof-card": "App-store close: wordmark, stars, a proof line",
    "store-badge-lockup": "App Store and Google Play badges under a line",
    "instagram-follow": "An Instagram follow card with the button pressed",
  },
  "Transitions and hits": {
    "whip-pan-cut": "A whip pan between scenes with motion blur",
    "iris-reveal": "A circle opening from a point onto the next scene",
    "zoom-through-transition": "Zooming through a card into the next scene",
    "match-cut": "A shape carried across a hard cut",
    "beat-accent": "A flash and micro-pulse on a hit (the hook word)",
  },
};
const PORTED = { "number-wheel": "Odometer (src/shared/ui)" };

// Ruled out for this channel, with the reason the gallery shows.
function ruledOut(item) {
  const t = item.tags ?? [];
  if (item.name.startsWith("hw-") || t.includes("handwritten")) return "handwritten lettering: the user rejected cursive (decisions.md)";
  if (t.includes("caption-style")) return "caption style: ours are plain Poppins (decisions.md)";
  if (t.some((x) => ["webgpu", "webgpu-shader", "webgl", "webgl2", "three-js", "html-in-canvas"].includes(x))) return "WebGL/WebGPU: not our flat white look, and untested in our renderer";
  return null;
}

// 1. The registry at the pinned commit (blocks, components, examples) and the license; no LFS, no packages.
const have = fs.existsSync(path.join(src, ".git")) && spawnSync("git", ["rev-parse", "HEAD"], { cwd: src, encoding: "utf8" }).stdout.trim();
if (have !== COMMIT) {
  fs.rmSync(src, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const env = { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" };
  for (const args of [
    ["clone", "--filter=blob:none", "--no-checkout", REPO, src],
    ["-C", src, "sparse-checkout", "set", "--no-cone", "/registry/", "/LICENSE"],
    ["-C", src, "checkout", "--quiet", COMMIT],
  ]) {
    const r = spawnSync("git", args, { env, stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  }
}

// 2. Every item's registry-item.json.
const items = [];
for (const kind of ["blocks", "components"]) {
  const dir = path.join(src, "registry", kind);
  for (const name of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, name, "registry-item.json");
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    items.push({ ...j, kind: kind.slice(0, -1), folder: `src/registry/${kind}/${name}` });
  }
}
const byName = new Map(items.map((i) => [i.name, i]));
for (const group of Object.values(PICKS)) for (const name of Object.keys(group)) if (!byName.has(name)) throw new Error(`pick ${name} is not in the catalog`);

// 3. The gallery.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function card(item, note) {
  const p = item.preview ?? {};
  const why = ruledOut(item);
  const dims = item.dimensions ? `${item.dimensions.width}×${item.dimensions.height}` : "any size";
  const media = p.poster || p.video
    ? `<div class="media"${p.video ? ` data-video="${esc(p.video)}"` : ""}>${p.poster ? `<img loading="lazy" src="${esc(p.poster)}" alt="">` : ""}${p.video ? `<span class="play">▶</span>` : ""}</div>`
    : `<div class="media none">no preview</div>`;
  const search = [item.name, item.title, item.description, ...(item.tags ?? [])].join(" ").toLowerCase();
  return `<article data-search="${esc(search)}"${why ? ' class="out"' : ""}>${media}<div class="body">
<h3><a href="${esc(item.folder)}">${esc(item.title ?? item.name)}</a> <code>${esc(item.name)}</code></h3>
${note ? `<p class="note">${esc(note)}</p>` : ""}${PORTED[item.name] ? `<p class="ported">Ported: ${esc(PORTED[item.name])}</p>` : ""}${why ? `<p class="why">Ruled out: ${esc(why)}</p>` : ""}
<p>${esc(item.description)}</p><p class="meta">${item.kind} · ${dims}${item.duration ? ` · ${item.duration}s` : ""} · ${esc((item.tags ?? []).join(", "))}</p></div></article>`;
}
const picked = new Set(Object.values(PICKS).flatMap((g) => Object.keys(g)));
const picks = Object.entries(PICKS).map(([title, group]) =>
  `<h2>${esc(title)}</h2><div class="grid">${Object.entries(group).map(([n, note]) => card(byName.get(n), note)).join("")}</div>`).join("");
const rest = (kind) => items.filter((i) => i.kind === kind && !picked.has(i.name)).map((i) => card(i)).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HyperFrames Catalog</title><style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#141414;--muted:#6c6c74;--line:#e4e2dd;--accent:#ff7a00;--ok:#1f9d55;--bad:#b4434a}
@media (prefers-color-scheme:dark){:root{--bg:#151517;--card:#1e1e21;--ink:#ececec;--muted:#9a9aa3;--line:#2e2e33}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:14px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header h1{font-size:18px;margin:0}header input{flex:1;min-width:200px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit}
header label{color:var(--muted);font-size:13px}main{padding:8px 24px 60px;max-width:1500px;margin:0 auto}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:28px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
article{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
article.out{opacity:.55}.media{position:relative;aspect-ratio:16/9;background:#000;cursor:pointer;display:flex;align-items:center;justify-content:center}
.media img,.media video{width:100%;height:100%;object-fit:contain}.media.none{cursor:default;color:#777;font-size:13px}
.play{position:absolute;right:10px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;border-radius:99px;padding:2px 10px;font-size:13px}
.body{padding:10px 14px 12px}h3{margin:0 0 4px;font-size:15px}h3 a{color:inherit}code{font-size:12px;color:var(--muted)}
p{margin:4px 0}.note{color:var(--accent);font-weight:600}.ported{color:var(--ok);font-weight:600}.why{color:var(--bad);font-size:13px}.meta{color:var(--muted);font-size:12px}
details>summary{cursor:pointer;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:28px 0 10px}
.hide-out article.out{display:none}[hidden]{display:none!important}
</style></head><body><header><h1>HyperFrames catalog</h1><input id="q" placeholder="Search ${items.length} items: phone, tap, number, wipe…" autofocus>
<label><input type="checkbox" id="hideOut" checked> hide ruled out</label></header><main class="hide-out" id="main">
<p class="meta">Commit ${COMMIT.slice(0, 7)} · Apache-2.0 (HeyGen) · a design library: we port pieces into Remotion, we don't run them. Click a preview to play it. Titles open the source.</p>
${picks}
<details><summary>All other blocks</summary><div class="grid">${rest("block")}</div></details>
<details><summary>All other components</summary><div class="grid">${rest("component")}</div></details>
</main><script>
document.addEventListener("click",e=>{const m=e.target.closest(".media[data-video]");if(!m||m.querySelector("video"))return;
const v=document.createElement("video");v.src=m.dataset.video;v.autoplay=v.loop=v.muted=v.playsInline=true;v.controls=true;m.replaceChildren(v)});
const q=document.getElementById("q"),main=document.getElementById("main");
q.addEventListener("input",()=>{const s=q.value.trim().toLowerCase();document.querySelectorAll("article").forEach(a=>a.hidden=!!s&&!a.dataset.search.includes(s));
if(s)document.querySelectorAll("details").forEach(d=>d.open=true)});
document.getElementById("hideOut").addEventListener("change",e=>main.classList.toggle("hide-out",e.target.checked));
</script></body></html>`;
fs.writeFileSync(path.join(out, "index.html"), html);

const outCount = items.filter(ruledOut).length;
console.log(`${items.length} items (${items.filter((i) => i.kind === "block").length} blocks, ${items.filter((i) => i.kind === "component").length} components), ${picked.size} picked, ${outCount} ruled out`);
console.log(`gallery: ${path.join(out, "index.html")}`);
console.log(`Windows: \\\\wsl.localhost\\Ubuntu${path.join(out, "index.html").replaceAll("/", "\\")}`);
