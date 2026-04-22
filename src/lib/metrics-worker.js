// metrics-worker.js — generator that runs zadu-js Trustworthiness and
// Continuity and yields progress ticks. Stringified and shipped into a
// Web Worker via src/lib/worker-helper.js. See docs/research/zadu-js.md.
//
// The worker is spawned with { type: "module" } and a preamble that imports
// zadu-js and publishes it on globalThis.zadu. Helpers stay inside the
// generator body (stringification drops siblings).
//
// Expected arg shape:
//   { hd: number[][], ld: number[][], k: number }
//
// Yields:
//   { status: "Starting" | "Computing" | "Finished",
//     metric: "trustworthiness" | "continuity",
//     result?: { score, localScores, k, n } }

/* eslint-disable no-undef */

export const METRICS_WORKER_PREAMBLE = `
import zadu, { trustworthiness, continuity } from "https://cdn.jsdelivr.net/npm/zadu-js@1.0.0/+esm";
globalThis.zadu = zadu;
globalThis.zaduFns = { trustworthiness, continuity };
`;

export function* computeMetrics({ hd, ld, k = 20 }) {
  const n = hd.length;
  if (n !== ld.length) throw new Error(`hd.length (${n}) !== ld.length (${ld.length})`);
  if (k >= n) throw new Error(`k (${k}) must be less than n (${n})`);

  const { trustworthiness, continuity } = globalThis.zaduFns ?? {};
  if (!trustworthiness || !continuity) throw new Error("zadu-js functions not loaded (preamble did not run)");

  yield { status: "Starting", metric: null, k, n };

  yield { status: "Computing", metric: "trustworthiness", k, n };
  const t = trustworthiness(hd, ld, k);

  yield { status: "Computing", metric: "continuity", k, n, partial: { trustworthiness: t } };
  const c = continuity(hd, ld, k);

  yield {
    status: "Finished",
    metric: null,
    k, n,
    result: { trustworthiness: t, continuity: c },
  };
}
