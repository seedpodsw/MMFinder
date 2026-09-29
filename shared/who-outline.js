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

function largestDark(rgba, width, height) {
  const n = width * height;
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const lum = (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3;
    dark[i] = lum < 150 ? 1 : 0;
  }
  const seen = new Uint8Array(n);
  let best = null;
  for (let i = 0; i < n; i++) {
    if (!dark[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    const comp = [];
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % width;
      const y = (p / width) | 0;
      if (x > 0) push(p - 1);
      if (x + 1 < width) push(p + 1);
      if (y > 0) push(p - width);
      if (y + 1 < height) push(p + width);
    }
    if (!best || comp.length > best.length) best = comp;
    function push(q) {
      if (dark[q] && !seen[q]) {
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

export function whiteOutline(rgba, width, height) {
  const n = width * height;
  let clear = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 16) clear++;
  let mask;
  if (clear > n * 0.08) {
    mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = rgba[i * 4 + 3] > 32 ? 1 : 0;
  } else {
    mask = largestDark(rgba, width, height);
  }
  mask = dilate(mask, width, height, 2);
  mask = erode(mask, width, height, 1);
  fillHoles(mask, width, height);
  const outer = dilate(mask, width, height, 2);
  const inner = erode(mask, width, height, 2);
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    if (outer[i] && !inner[i]) {
      const o = i * 4;
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

