// Settings for `remotion studio` and `remotion render`. Full list: https://www.remotion.dev/docs/config
import os from "node:os";
import path from "node:path";
import { Config } from "@remotion/cli/config";

// Remotion loads .env by itself and writes every value into Studio's page and the render's browser tab. Nothing drawn here
// reads a key, so it gets an empty file instead. The tools that need the key load .env themselves.
Config.setDotEnvLocation("tools/lib/remotion.env");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(16); // high quality: Instagram re-encodes every upload, so start from a clean picture
Config.setPixelFormat("yuv420p");
// Render tabs at once: one per ~3.5 GB of RAM, at most half the CPU cores. Each tab decodes 1080x1920 video. 7.6 GB runs two.
Config.setConcurrency(Math.max(1, Math.min(Math.floor(os.totalmem() / 3.5e9), Math.floor(os.cpus().length / 2))));

// `@shared/...` points at src/shared, so reel folders can import layouts, captions and UI pieces without long
// ../../ paths. tsconfig.json has the matching "paths" entry for the type checker.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias ?? {}), "@shared": path.join(process.cwd(), "src/shared") },
  },
}));
