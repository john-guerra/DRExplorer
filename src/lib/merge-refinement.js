// merge-refinement.js — fold a local refinement's output back into the
// main embedding.
//
// Why this exists: refining a brushed subset runs DR on just those points,
// so the refined 2D coordinates live in an independent coordinate system
// (their centroid + extent are arbitrary). To merge back, we Procrustes-
// align the refined coords onto the brushed points' *current* positions —
// this keeps the refined cluster roughly where it was on the canvas and
// only changes its internal arrangement.
//
// Inputs:
//   currentEmbedding  number[][]  — the full current 2D embedding, aligned
//                                   with `allIds` (one [x, y] per row)
//   allIds            any[]       — ids for each row of currentEmbedding,
//                                   in matching order
//   refinedEmbedding  number[][]  — 2D coords from the refinement DR run,
//                                   aligned with `brushedIds`
//   brushedIds        any[]       — ids of the rows that were refined, in
//                                   the same order as refinedEmbedding
//
// Output:
//   A new number[][] (same length as currentEmbedding) where the brushed
//   indices have been overwritten with Procrustes-aligned refined coords.
//
// Degenerate cases:
//   - If fewer than 2 brushed ids or mismatched sizes → returns the
//     original currentEmbedding unchanged.
//   - If the procrustes scale comes out non-finite (pathological input),
//     we fall back to centroid + mean-radius alignment, which still keeps
//     the cluster in the right place.

import { procrustes } from "./procrustes.js";

export function alignAndMerge({
  currentEmbedding,
  allIds,
  refinedEmbedding,
  brushedIds,
}) {
  if (
    !Array.isArray(currentEmbedding) ||
    !Array.isArray(refinedEmbedding) ||
    refinedEmbedding.length !== brushedIds.length ||
    brushedIds.length < 2
  ) {
    return currentEmbedding;
  }

  // Build an id → current-coord lookup so we can align against the exact
  // current positions of the brushed rows.
  const currentById = new Map();
  for (let i = 0; i < allIds.length; i++) {
    currentById.set(allIds[i], currentEmbedding[i]);
  }

  // Pair up refined → current at the same ids.
  const src = [];
  const dst = [];
  for (let j = 0; j < brushedIds.length; j++) {
    const cur = currentById.get(brushedIds[j]);
    if (!cur) continue;
    src.push(refinedEmbedding[j]);
    dst.push(cur);
  }
  if (src.length < 2) return currentEmbedding;

  let align;
  try {
    align = procrustes(src, dst);
  } catch {
    return currentEmbedding;
  }

  // Guard against pathological scale (NaN or Infinity).
  const safe = Number.isFinite(align.scale) && Math.abs(align.scale) > 1e-9;
  if (!safe) return currentEmbedding;

  // Apply the transform to every refined coord and fold into a copy of
  // currentEmbedding at the matching ids.
  const brushedById = new Map();
  for (let j = 0; j < brushedIds.length; j++) {
    const [rx, ry] = refinedEmbedding[j];
    brushedById.set(brushedIds[j], align.apply(rx, ry));
  }

  const out = new Array(currentEmbedding.length);
  for (let i = 0; i < currentEmbedding.length; i++) {
    const upd = brushedById.get(allIds[i]);
    out[i] = upd ?? currentEmbedding[i];
  }
  return out;
}
