import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  'assets/images/icon.png',
  'assets/images/adaptive-icon.png',
];

function isAlmostWhite(r, g, b) {
  // Treat near-white as background margin.
  return r >= 245 && g >= 245 && b >= 245;
}

function findContentBounds(data, w, h) {
  // If only a handful of pixels are non-white (noise), ignore them.
  const rowThreshold = Math.max(16, Math.floor(w * 0.02)); // >= 2% of row
  const colThreshold = Math.max(16, Math.floor(h * 0.02)); // >= 2% of col

  const countRow = (y) => {
    let c = 0;
    const base = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = base + x * 4;
      const r = data[idx + 0];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (!isAlmostWhite(r, g, b)) c++;
    }
    return c;
  };

  const countCol = (x) => {
    let c = 0;
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      const r = data[idx + 0];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (!isAlmostWhite(r, g, b)) c++;
    }
    return c;
  };

  let top = 0;
  for (let y = 0; y < h; y++) {
    if (countRow(y) > rowThreshold) {
      top = y;
      break;
    }
  }

  let bottom = h - 1;
  for (let y = h - 1; y >= 0; y--) {
    if (countRow(y) > rowThreshold) {
      bottom = y;
      break;
    }
  }

  let left = 0;
  for (let x = 0; x < w; x++) {
    if (countCol(x) > colThreshold) {
      left = x;
      break;
    }
  }

  let right = w - 1;
  for (let x = w - 1; x >= 0; x--) {
    if (countCol(x) > colThreshold) {
      right = x;
      break;
    }
  }

  return { left, top, right, bottom };
}

function bilinearSample(data, sw, sh, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(sw - 1, x0 + 1);
  const y1 = Math.min(sh - 1, y0 + 1);

  const dx = x - x0;
  const dy = y - y0;

  function px(ix, iy) {
    const idx = (iy * sw + ix) * 4;
    return [
      data[idx + 0],
      data[idx + 1],
      data[idx + 2],
      data[idx + 3],
    ];
  }

  const p00 = px(x0, y0);
  const p10 = px(x1, y0);
  const p01 = px(x0, y1);
  const p11 = px(x1, y1);

  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const v0 = p00[c] * (1 - dx) + p10[c] * dx;
    const v1 = p01[c] * (1 - dx) + p11[c] * dx;
    out[c] = Math.round(v0 * (1 - dy) + v1 * dy);
  }
  return out;
}

function resizeRGBA(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) * (sh / dh) - 0.5;
    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) * (sw / dw) - 0.5;
      const [r, g, b, a] = bilinearSample(src, sw, sh, Math.max(0, Math.min(sw - 1, sx)), Math.max(0, Math.min(sh - 1, sy)));
      const idx = (y * dw + x) * 4;
      dst[idx + 0] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = a;
    }
  }
  return dst;
}

async function trimAndScale(inputRelPath) {
  const inputPath = path.resolve(PROJECT_ROOT, inputRelPath);
  const raw = fs.readFileSync(inputPath);
  const png = PNG.sync.read(raw);
  const w = png.width;
  const h = png.height;
  const data = png.data;

  const { left: rawLeft, top: rawTop, right: rawRight, bottom: rawBottom } = findContentBounds(data, w, h);
  let minX = rawLeft;
  let minY = rawTop;
  let maxX = rawRight;
  let maxY = rawBottom;

  // Safety: if bounds are invalid, do nothing.
  if (minX >= maxX || minY >= maxY) {
    return { inputRelPath, changed: false, reason: 'invalid-bounds' };
  }

  // Expand bbox a bit to keep some margin.
  const pad = Math.round(Math.max(w, h) * 0.02); // 2%
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(w - 1, maxX + pad);
  const bottom = Math.min(h - 1, maxY + pad);

  const cropW = right - left + 1;
  const cropH = bottom - top + 1;

  // Crop into a new buffer
  const cropped = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((top + y) * w + (left + x)) * 4;
      const dstIdx = (y * cropW + x) * 4;
      cropped[dstIdx + 0] = data[srcIdx + 0];
      cropped[dstIdx + 1] = data[srcIdx + 1];
      cropped[dstIdx + 2] = data[srcIdx + 2];
      cropped[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  // Make square by padding with white, then resize back to original size.
  const side = Math.max(cropW, cropH);
  const square = Buffer.alloc(side * side * 4, 255);
  for (let i = 0; i < side * side; i++) square[i * 4 + 3] = 255;

  const xOff = Math.floor((side - cropW) / 2);
  const yOff = Math.floor((side - cropH) / 2);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y * cropW + x) * 4;
      const dstIdx = ((yOff + y) * side + (xOff + x)) * 4;
      square[dstIdx + 0] = cropped[srcIdx + 0];
      square[dstIdx + 1] = cropped[srcIdx + 1];
      square[dstIdx + 2] = cropped[srcIdx + 2];
      square[dstIdx + 3] = cropped[srcIdx + 3];
    }
  }

  const resized = resizeRGBA(square, side, side, w, h);

  const out = new PNG({ width: w, height: h });
  out.data = resized;
  fs.writeFileSync(inputPath, PNG.sync.write(out));

  return { inputRelPath, changed: true, bbox: { left, top, right, bottom }, pad };
}

async function main() {
  const results = [];
  for (const rel of TARGETS) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await trimAndScale(rel));
  }
  // Print results for debugging.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

