// procrustes.js — 2D Procrustes alignment: find (rotation, scale, translation)
// that best maps `src` onto `dst` in the least-squares sense. Closed-form
// using a direct 2D-specific derivation (no SVD — we sidestep the degeneracy
// that 2×2 SVD hits when singular values are equal, which is exactly the
// "already close to aligned" case we get with two DR embeddings).
//
//   const align = procrustes(src, dst);    // each: number[][] shaped [n][2]
//   const [x, y] = align.apply(px, py);    // transform a new point
//
//   align.n           -- number of source→target pairs used
//   align.rotation    -- [r00, r01, r10, r11] row-major 2×2 rotation
//   align.scale       -- uniform scale factor
//   align.translation -- [tx, ty]
//
// For 2D, the optimal rotation angle is
//   θ = atan2(Σ Sᵢ×Dᵢ, Σ Sᵢ·Dᵢ)
// where Sᵢ, Dᵢ are centered. The cross-product term captures the y-component
// of the aggregate "shear" and the dot-product term captures its x-component,
// so atan2 of those gives the angle that rotates S into D. Scale is then
//   c = (cosθ · Σ Sᵢ·Dᵢ + sinθ · Σ Sᵢ×Dᵢ) / Σ ||Sᵢ||²
// which is the least-squares scale after rotation.

export function procrustes(src, dst) {
  const n = Math.min(src.length, dst.length);
  if (n < 2) throw new Error(`procrustes needs at least 2 points (got ${n})`);

  // Centroids.
  let sx = 0, sy = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    sx += src[i][0]; sy += src[i][1];
    dx += dst[i][0]; dy += dst[i][1];
  }
  sx /= n; sy /= n; dx /= n; dy /= n;

  // Aggregate dot and cross products over centered points.
  let dotSum = 0, crossSum = 0, srcNorm = 0;
  for (let i = 0; i < n; i++) {
    const s0 = src[i][0] - sx;
    const s1 = src[i][1] - sy;
    const d0 = dst[i][0] - dx;
    const d1 = dst[i][1] - dy;
    dotSum   += s0 * d0 + s1 * d1;
    crossSum += s0 * d1 - s1 * d0;
    srcNorm  += s0 * s0 + s1 * s1;
  }

  // Optimal rotation angle.
  const theta = Math.atan2(crossSum, dotSum);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const r00 = cos, r01 = -sin, r10 = sin, r11 = cos;

  // Uniform scale.
  const scale = srcNorm > 0 ? (cos * dotSum + sin * crossSum) / srcNorm : 1;

  // Translation so centroids coincide after rotate+scale.
  const tx = dx - scale * (r00 * sx + r01 * sy);
  const ty = dy - scale * (r10 * sx + r11 * sy);

  return {
    n,
    rotation: [r00, r01, r10, r11],
    scale,
    translation: [tx, ty],
    apply(x, y) {
      return [scale * (r00 * x + r01 * y) + tx, scale * (r10 * x + r11 * y) + ty];
    },
  };
}
