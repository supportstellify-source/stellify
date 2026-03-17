// build.mjs – Stellify Build-Skript
import * as esbuild from "esbuild";
import { readFileSync, statSync } from "fs";

console.log("🔨 Stellify Build gestartet...");

await esbuild.build({
  entryPoints: ["stellify-v11-final.jsx"],
  bundle: true,
  minify: true,
  platform: "browser",
  target: ["es2020", "chrome80", "firefox75", "safari13"],
  outfile: "stellify-bundle.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  jsx: "automatic",
  logLevel: "info",
});

const size = statSync("stellify-bundle.js").size;
console.log(`✅ Build erfolgreich: stellify-bundle.js (${(size / 1024).toFixed(0)} KB)`);
