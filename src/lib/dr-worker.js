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
// Metric functions. druid's ESM bundle doesn't re-export these, so we inline
// textbook implementations. Numerically simpler than druid's internal versions
// (no neumair summation) but identical for the scale of data we handle.
globalThis.drMetrics = {
  euclidean: (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  },
  euclidean_squared: (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return s;
  },
  manhattan: (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s;
  },
  chebyshev: (a, b) => {
    let m = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > m) m = d;
    }
    return m;
  },
  cosine: (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : 1 - dot / denom;
  },
};
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

  // Map string metric names → functions. druid expects a callable metric,
  // and its bundled ESM doesn't re-export metric functions, so we bind
  // against globalThis.drMetrics from the preamble.
  const cleanParams = { ...params };
  if (typeof cleanParams.metric === "string") {
    const metricFn = globalThis.drMetrics?.[cleanParams.metric];
    if (!metricFn) {
      const known = Object.keys(globalThis.drMetrics ?? {}).join(", ");
      throw new Error(`Unknown metric "${cleanParams.metric}" (known: ${known})`);
    }
    cleanParams.metric = metricFn;
  }

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
