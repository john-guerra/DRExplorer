// dr-worker.js — generator that runs a druid.js DR algorithm and yields
// progress ticks. Intended to be stringified and run inside a Web Worker
// via src/lib/worker-helper.js.
//
// The worker preamble must expose `druid` on the global scope, e.g.
//   importScripts("https://cdn.jsdelivr.net/npm/@saehrimnir/druidjs@0.8.0/dist/druid.min.js")
// or
//   import * as druid from "https://cdn.jsdelivr.net/npm/@saehrimnir/druidjs@0.8.0/+esm"
//
// Expected arg shape:
//   { matrix: number[][], algo: "UMAP" | "TSNE" | ..., params: {...},
//     showDynamic?: boolean, yieldEvery?: number }
//
// Yields:
//   { status, currentEpoch, targetEpoch, embedding, algo }
//
// TODO(phase1): wire this into the reactive graph as `runStatus`.

/* eslint-disable no-undef */

export function* drFit({ matrix, algo, params = {}, showDynamic = true, yieldEvery = 5 }) {
  yield {
    status: "Initializing",
    currentEpoch: 0,
    targetEpoch: 0,
    algo,
    embedding: matrix.map(() => [Math.random() * 2 - 1, Math.random() * 2 - 1]),
  };

  const Cls = druid?.[algo] ?? druid?.[algo.toUpperCase()];
  if (!Cls) {
    throw new Error(`druid.js has no algorithm called "${algo}"`);
  }

  const dr = new Cls(matrix, params);

  if (typeof dr.generator === "function") {
    const targetEpoch = params._n_epochs ?? params.iterations ?? 350;
    yield { status: "Starting", currentEpoch: 0, targetEpoch, algo, embedding: _toRows(dr.transform?.(0) ?? matrix.map(() => [0, 0])) };
    let i = 0;
    for (const Y of dr.generator()) {
      i++;
      if (showDynamic && i % yieldEvery === 0) {
        yield { status: "Running", currentEpoch: i, targetEpoch, algo, embedding: _toRows(Y) };
      }
    }
    yield { status: "Finished", currentEpoch: i, targetEpoch: i, algo, embedding: _toRows(dr.projection ?? dr.Y ?? []) };
  } else {
    const Y = dr.transform();
    yield { status: "Finished", currentEpoch: 1, targetEpoch: 1, algo, embedding: _toRows(Y) };
  }
}

function _toRows(Y) {
  if (!Y) return [];
  if (Array.isArray(Y) && Array.isArray(Y[0])) return Y;
  if (typeof Y.to2dArray === "function") return Y.to2dArray();
  if (typeof Y.values !== "undefined") return Array.from(Y.values);
  return Y;
}
