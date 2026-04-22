// dr-worker.js — generator that runs a druid.js DR algorithm and yields
// progress ticks. Stringified and shipped into a Web Worker via
// src/lib/worker-helper.js. See docs/research/umap-playground-dissection.md.
//
// The worker is spawned with `{ type: "module" }` and a preamble that imports
// druid.js and publishes it on `globalThis.druid`. Helpers are defined INSIDE
// drFit because Function.prototype.toString() only captures the function body;
// sibling top-level functions do not travel with it. Duplicating them here
// beats relying on module bundling inside a Blob Worker.
//
// Expected arg shape:
//   { matrix: number[][], algo: "UMAP" | "TSNE" | ..., params: {...},
//     showDynamic?: boolean, yieldEvery?: number }
//
// Yields (one per progress tick):
//   { status, currentEpoch, targetEpoch, embedding: number[][], algo, note? }

/* eslint-disable no-undef */

export const DR_WORKER_PREAMBLE = `
import * as druid from "https://cdn.jsdelivr.net/npm/@saehrimnir/druidjs@0.8.0/+esm";
globalThis.druid = druid;
`;

export function* drFit({ matrix, algo, params = {}, showDynamic = true, yieldEvery = 5 }) {
  // druid.js yields the projection as Array<Array<number>> for all algorithms
  // (verified for UMAP, t-SNE, PCA). Matrix-typed outputs exist internally but
  // .generator() returns plain arrays. This helper stays here because
  // stringification drops siblings.
  function matrixToRows(Y) {
    if (!Y) return [];
    if (Array.isArray(Y) && (Y.length === 0 || Array.isArray(Y[0]))) return Y;
    if (typeof Y.row === "function" && Number.isInteger(Y._rows)) {
      const out = [];
      const cols = Math.min(Y._cols, 2);
      for (let i = 0; i < Y._rows; i++) {
        const r = Y.row(i);
        const o = new Array(cols);
        for (let c = 0; c < cols; c++) o[c] = r[c];
        out.push(o);
      }
      return out;
    }
    return Y;
  }

  const n = matrix.length;
  const d = matrix[0]?.length ?? 0;

  yield {
    algo, status: "Initializing", currentEpoch: 0, targetEpoch: 0,
    note: `received ${n}×${d} matrix`,
    embedding: matrix.map(() => [Math.random() * 2 - 1, Math.random() * 2 - 1]),
  };

  const druid = globalThis.druid;
  if (!druid) throw new Error("globalThis.druid is not defined (preamble did not run)");
  const Cls = druid[algo];
  if (!Cls) throw new Error(`druid.js has no algorithm called "${algo}" (known: ${Object.keys(druid).filter(k => /^[A-Z]/.test(k)).slice(0, 25).join(", ")})`);

  // druid expects `metric` to be a function, not a string. Its bundled ESM
  // doesn't re-export metric functions at top level, so for v1 we strip
  // string-valued `metric` — druid then uses its default (euclidean for UMAP,
  // euclidean_squared for t-SNE). Custom metrics land in v2.
  const cleanParams = { ...params };
  if (typeof cleanParams.metric === "string") delete cleanParams.metric;

  yield {
    algo, status: "Constructing", currentEpoch: 0, targetEpoch: 0,
    note: `new ${algo}(...)`,
    embedding: [],
  };
  const dr = new Cls(matrix, cleanParams);

  const targetEpoch =
    cleanParams._n_epochs ??
    cleanParams.iterations ??
    cleanParams.max_iteration ??
    (algo === "UMAP" || algo === "TSNE" || algo === "TriMap" ? 350 : 1);

  yield {
    algo, status: "Starting", currentEpoch: 0, targetEpoch,
    note: `entering generator(${targetEpoch})`,
    embedding: matrix.map(() => [Math.random() * 2 - 1, Math.random() * 2 - 1]),
  };

  let i = 0;
  for (const Y of dr.generator(targetEpoch)) {
    i++;
    if (showDynamic && (i % yieldEvery === 0 || i === 1 || i === targetEpoch)) {
      yield {
        algo, status: "Running", currentEpoch: i, targetEpoch,
        embedding: matrixToRows(Y),
      };
    }
  }

  yield {
    algo, status: "Finished", currentEpoch: i || 1, targetEpoch: targetEpoch || 1,
    embedding: matrixToRows(dr.projection ?? dr.Y),
  };
}
