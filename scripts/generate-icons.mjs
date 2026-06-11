// Rasterize the PWA icons from the source SVGs.
//
// iOS Safari ignores SVG manifest icons, so "Add to Home Screen" falls back to
// a page screenshot unless we ship PNGs — apple-touch-icon especially.
// Run after editing public/icon*.svg:  node scripts/generate-icons.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// apple-touch-icon uses the full-bleed maskable art: iOS composites its own
// rounded-corner mask, so the transparent-cornered icon.svg would show black.
const jobs = [
  { src: "icon.svg", out: "icon-192.png", size: 192 },
  { src: "icon.svg", out: "icon-512.png", size: 512 },
  { src: "icon-maskable.svg", out: "icon-maskable-192.png", size: 192 },
  { src: "icon-maskable.svg", out: "icon-maskable-512.png", size: 512 },
  { src: "icon-maskable.svg", out: "apple-touch-icon.png", size: 180 },
];

for (const { src, out, size } of jobs) {
  const svg = await readFile(path.join(publicDir, src));
  // density scales the SVG rasterization so large sizes stay crisp (72dpi base on a 512 viewBox)
  await sharp(svg, { density: Math.ceil((72 * size) / 512) + 72 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, out));
  console.log(`✓ ${out} (${size}×${size}) from ${src}`);
}
