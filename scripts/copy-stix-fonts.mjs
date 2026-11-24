/**
 * Copy STIX Two Text / Math `.woff2` subsets from @fontsource into public/fonts/.
 * Run from predev / prebuild so GitHub Pages always has the OFL faces.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public", "fonts");

const TEXT = join(root, "node_modules", "@fontsource", "stix-two-text");
const MATH = join(root, "node_modules", "@fontsource", "stix-two-math");

const FILES = [
  ["stix-two-text", "stix-two-text-latin-400-normal.woff2"],
  ["stix-two-text", "stix-two-text-latin-400-italic.woff2"],
  ["stix-two-text", "stix-two-text-latin-700-normal.woff2"],
  ["stix-two-text", "stix-two-text-latin-700-italic.woff2"],
  ["stix-two-text", "stix-two-text-greek-400-normal.woff2"],
  ["stix-two-text", "stix-two-text-greek-400-italic.woff2"],
  ["stix-two-text", "stix-two-text-greek-700-normal.woff2"],
  ["stix-two-text", "stix-two-text-greek-700-italic.woff2"],
  ["stix-two-math", "stix-two-math-latin-400-normal.woff2"],
];

mkdirSync(destDir, { recursive: true });

for (const [pkg, file] of FILES) {
  const src = join(pkg === "stix-two-text" ? TEXT : MATH, "files", file);
  if (!existsSync(src)) {
    console.warn(`[copy-stix-fonts] missing ${src} — run npm install`);
    continue;
  }
  copyFileSync(src, join(destDir, file));
}

const licenseSrc = join(TEXT, "LICENSE");
if (existsSync(licenseSrc)) {
  writeFileSync(join(destDir, "OFL-STIX.txt"), readFileSync(licenseSrc));
}

console.log(`[copy-stix-fonts] synced ${FILES.length} STIX Two faces → public/fonts/`);
