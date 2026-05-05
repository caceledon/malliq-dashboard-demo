// One-shot logo optimizer: converts the brand PNGs in src/assets/ into WebP at
// retina-friendly sizes. The painterly Mq monogram doesn't reduce cleanly to
// SVG, but it does survive WebP at moderate quality with ~95% byte savings.
//
// Re-run with `node scripts/optimize-logos.mjs` whenever the source PNGs are
// replaced. Outputs land beside the originals as <name>.webp.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '..', 'src', 'assets');

// Render at ~2x the largest in-use size so the image stays crisp on retina
// without paying for the original ~1500px raster.
const TARGETS = [
  { source: 'mini logo.png',  out: 'mini-logo.webp',  height: 96, quality: 86 },
  { source: 'logo white.png', out: 'logo-white.webp', height: 88, quality: 86 },
  { source: 'logo black.png', out: 'logo-black.webp', height: 88, quality: 86 },
];

async function fileSize(p) {
  try {
    const s = await stat(p);
    return s.size;
  } catch {
    return null;
  }
}

function fmt(bytes) {
  if (bytes == null) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function main() {
  let totalIn = 0;
  let totalOut = 0;
  for (const target of TARGETS) {
    const src = path.join(ASSETS_DIR, target.source);
    const dst = path.join(ASSETS_DIR, target.out);
    const inSize = await fileSize(src);
    if (inSize == null) {
      console.warn(`skip: ${target.source} not found`);
      continue;
    }
    await sharp(src)
      .resize({ height: target.height, withoutEnlargement: true })
      .webp({ quality: target.quality, effort: 6 })
      .toFile(dst);
    const outSize = await fileSize(dst);
    totalIn += inSize;
    totalOut += outSize ?? 0;
    const ratio = outSize != null ? (1 - outSize / inSize) * 100 : 0;
    console.log(
      `${target.source.padEnd(18)} ${fmt(inSize).padStart(9)}  →  ${target.out.padEnd(18)} ${fmt(outSize).padStart(9)}  (-${ratio.toFixed(1)}%)`,
    );
  }
  console.log('-'.repeat(72));
  console.log(`total            ${fmt(totalIn).padStart(9)}  →                    ${fmt(totalOut).padStart(9)}  (saved ${fmt(totalIn - totalOut)})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
