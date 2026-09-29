/** Pure white contour from a portrait. Alpha art uses the cutout; opaque shots use the dark body. */

function dilate(mask, width, height, radius) {
  const next = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          if (mask[yy * width + xx]) {
            on = 1;
            break;
          }
        }
      }
      next[y * width + x] = on;
    }
  }
  return next;
}

function erode(mask, width, height, radius) {
  const next = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 1;
      for (let dy = -radius; dy <= radius && on; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) {
          on = 0;
          break;
        }
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width || !mask[yy * width + xx]) {
            on = 0;
            break;
          }
        }
      }
      next[y * width + x] = on;
    }
  }
  return next;
}

function borderMedian(rgba, width, height) {
  const samples = [];
  const stepX = Math.max(1, Math.floor(width / 28));
  const stepY = Math.max(1, Math.floor(height / 28));
  const take = (x, y) => {
    const o = (y * width + x) * 4;
    samples.push((rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2]);
  };
  for (let x = 0; x < width; x += stepX) {
    take(x, 0);
    take(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    take(0, y);
    take(width - 1, y);
  }
  samples.sort((a, b) => (a & 255) + ((a >> 8) & 255) + (a >> 16) - ((b & 255) + ((b >> 8) & 255) + (b >> 16)));
  const mid = samples[samples.length >> 1] || 0;
  return [mid >> 16, (mid >> 8) & 255, mid & 255];
}

function largestComponent(raw, rgba, width, height, central) {
  const n = width * height;
  const seen = new Uint8Array(n);
  const x0 = Math.floor(width * 0.34);
  const x1 = Math.floor(width * 0.66);
  const y0 = Math.floor(height * 0.3);
  const y1 = Math.floor(height * 0.7);
  let best = null;
  let bestScore = 0;
  for (let i = 0; i < n; i++) {
    if (!raw[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    const comp = [];
    let hits = 0;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % width;
      const y = (p / width) | 0;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) hits++;
      if (x > 0) push(p - 1);
      if (x + 1 < width) push(p + 1);
      if (y > 0) push(p - width);
      if (y + 1 < height) push(p + width);
    }
    if (comp.length < 80) continue;
    if (central && hits < 24) continue;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let lumSum = 0;
    for (const p of comp) {
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (rgba) {
        const o = p * 4;
        lumSum += (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3;
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (central && bw > bh * 2.4 && bh < height * 0.22) continue;
    const score = central ? hits * (255 - lumSum / comp.length) : comp.length;
    if (!best || score > bestScore) {
      best = comp;
      bestScore = score;
    }
    function push(q) {
      if (raw[q] && !seen[q]) {
        seen[q] = 1;
        stack.push(q);
      }
    }
  }
  const mask = new Uint8Array(n);
  if (best) for (const p of best) mask[p] = 1;
  return mask;
}

function fillHoles(mask, width, height) {
  const n = width * height;
  const outside = new Uint8Array(n);
  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    if (p < 0 || p >= n || outside[p] || mask[p]) continue;
    outside[p] = 1;
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) stack.push(p - 1);
    if (x + 1 < width) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y + 1 < height) stack.push(p + width);
  }
  for (let i = 0; i < n; i++) if (!outside[i]) mask[i] = 1;
  return mask;
}

function subjectMask(rgba, width, height) {
  const n = width * height;
  const med = borderMedian(rgba, width, height);
  const medLum = (med[0] + med[1] + med[2]) / 3;
  const raw = new Uint8Array(n);
  const top = Math.floor(height * 0.3);
  const bottom = Math.floor(height * 0.92);
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      const dr = r - med[0];
      const dg = g - med[1];
      const db = b - med[2];
      const lum = (r + g + b) / 3;
      if (x < width * 0.08 || x > width * 0.92) continue;
      if (dr * dr + dg * dg + db * db > 52 * 52 || Math.abs(lum - medLum) > 42) raw[i] = 1;
    }
  }
  let mask = largestComponent(raw, rgba, width, height, true);
  let count = 0;
  for (let i = 0; i < n; i++) if (mask[i]) count++;
  if (count < n * 0.03) {
    const dark = new Uint8Array(n);
    const x0 = Math.floor(width * 0.12);
    const x1 = Math.floor(width * 0.88);
    for (let y = top; y < bottom; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * width + x;
        const o = i * 4;
        if ((rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3 < 120) dark[i] = 1;
      }
    }
    mask = largestComponent(dark, rgba, width, height, true);
  }
  const grown = dilate(mask, width, height, 8);
  for (let y = top; y < bottom; y++) {
    for (let x = Math.floor(width * 0.08); x < width * 0.92; x++) {
      const i = y * width + x;
      if (!grown[i] || mask[i]) continue;
      const o = i * 4;
      const dr = rgba[o] - med[0];
      const dg = rgba[o + 1] - med[1];
      const db = rgba[o + 2] - med[2];
      if (dr * dr + dg * dg + db * db > 26 * 26) mask[i] = 1;
    }
  }
  mask = dilate(mask, width, height, 2);
  mask = erode(mask, width, height, 1);
  const darkCore = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    const o = i * 4;
    if ((rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3 < 150) darkCore[i] = 1;
  }
  const nearDark = dilate(darkCore, width, height, 6);
  for (let i = 0; i < n; i++) if (!nearDark[i]) mask[i] = 0;
  return mask;
}

function interiorEdges(rgba, mask, width, height) {
  const edges = new Uint8Array(mask.length);
  const lum = (x, y) => {
    const o = (y * width + x) * 4;
    return (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3;
  };
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const gx =
        -lum(x - 1, y - 1) -
        2 * lum(x - 1, y) -
        lum(x - 1, y + 1) +
        lum(x + 1, y - 1) +
        2 * lum(x + 1, y) +
        lum(x + 1, y + 1);
      const gy =
        -lum(x - 1, y - 1) -
        2 * lum(x, y - 1) -
        lum(x + 1, y - 1) +
        lum(x - 1, y + 1) +
        2 * lum(x, y + 1) +
        lum(x + 1, y + 1);
      if (gx * gx + gy * gy > 42000) edges[i] = 1;
    }
  }
  return dilate(edges, width, height, 1);
}

export function whiteOutline(rgba, width, height) {
  const n = width * height;
  let clear = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 16) clear++;
  let mask;
  if (clear > n * 0.08) {
    mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4 + 3] > 32 ? 1 : 0;
    mask = largestComponent(mask, null, width, height, false);
  } else {
    mask = subjectMask(rgba, width, height);
  }
  mask = dilate(mask, width, height, 2);
  mask = erode(mask, width, height, 1);
  if (clear > n * 0.08) fillHoles(mask, width, height);
  const outer = dilate(mask, width, height, 4);
  const inner = erode(mask, width, height, 2);
  const detail = interiorEdges(rgba, inner, width, height);
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    if ((outer[i] && !inner[i]) || detail[i]) {
      const o = i * 4;
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

