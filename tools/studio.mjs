// Opens Remotion Studio to preview and scrub every reel. It takes the first free port from 3000 and prints the address
// (http://localhost:<port>, from Windows too). `npm run dev -- --port=3017` picks one.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Studio has no login and can edit the project's files, so it stays off the network (lib/localhost-only.cjs).
const preload = fileURLToPath(new URL("./lib/localhost-only.cjs", import.meta.url));
const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(preload)}`.trim() };
const r = spawnSync("npx", ["remotion", "studio", "src/index.ts", ...process.argv.slice(2)], { stdio: "inherit", env });
process.exit(r.status ?? 0);
