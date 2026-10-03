/** Encode generated transparent sources for mobile; preserve original images. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const allowed = new Set(["dance", "balloon", "raincoat", "chef", "gardener", "stargaze"]);
const out = path.resolve("public/nailong/mobile-v4");
await mkdir(out, { recursive: true });
for (const arg of process.argv.slice(2)) {
  const equal = arg.indexOf("=");
  const key = arg.slice(0, equal);
  if (equal < 0 || !allowed.has(key)) throw new Error("Expected known-pose=source.png");
  const source = arg.slice(equal + 1);
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) throw new Error(`Source ${key} must have transparency`);
  const file = path.join(out, `${key}.webp`);
  const result = await sharp(source).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 100, effort: 6 }).toFile(file);
  const stats = await sharp(file).stats();
  if (stats.channels[3]?.min !== 0) throw new Error(`Lost transparency in ${key}`);
  console.log(JSON.stringify({ key, file, bytes: result.size, alpha: true }));
}
