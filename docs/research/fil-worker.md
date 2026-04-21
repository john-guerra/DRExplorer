# Fil's Worker utility

Source: `docs/worker.tgz` → `d9e5cc6facdf568b@563.js`. Notebook home: https://observablehq.com/@fil/worker

## What it does
Wraps `new Worker(blobURL)` so a user can pass a plain function, an async function, or a generator function into a Web Worker, and get the worker's outputs streamed back into the reactive graph through `Generators.queue` or `Generators.observe`.

## Two APIs

### Classic (stable)
```js
import { worker } from "@fil/worker";

// sync function
Generators.queue(worker(d => d ** 2, 10));

// generator streams each yield
Generators.queue(worker(
  function* ({ n, k }) { let s = 0; while (n--) yield k * (s += n); },
  { n: 100, k: 21 }
));

// ESM preamble for importing modules inside the worker
Generators.queue(worker(
  () => dthree.range(0, 10),
  { type: "module" },
  `import * as dthree from "https://cdn.jsdelivr.net/npm/d3@7/+esm";`
));

// classic preamble via importScripts
Generators.queue(worker(
  delaunay,
  [0, 0, 1, 2.1, 4, 3],
  `importScripts("https://unpkg.com/d3-delaunay");`
));
```

Signature: `worker(fn, arg, preamble?, transferList?) → (notify) => terminate`. Returns a source function compatible with `Generators.queue` / `Generators.observe`.

### Tagged template (not yet stabilized per Fil's own note)
```js
import { observeWorker as worker } from "@fil/worker";

worker`
  importScripts("https://unpkg.com/d3-delaunay@6");
  function heavy(values) { /* ... */ }
  return heavy(${values});
`;
```
Interpolated `${values}` are sent as `data.a0`, `data.a1`, ... in the worker; functions are stringified.

## Internal shape (from `d9e5cc6facdf568b@563.js`)

```js
function worker(f, e, preamble, transferList) {
  const b = new Blob([workertext(f, preamble)], { type: "text/javascript" });
  return function (notify) {
    const url = URL.createObjectURL(b);
    const w = new Worker(url, { type: (e && e?.type) || "classic" });
    w.addEventListener("message", r => notify(r.data));
    w.postMessage(e, transferList);
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  };
}

function workertext(f, preamble = "") {
  return `${preamble}
    const __run__ = ${typeof f === "function" ? function_stringify(f) : f};
    self.onmessage = async function (e) {
      const t0 = performance.now();
      let result = await __run__(e.data);
      const postHelper = p => postMessage(
        typeof p !== "object" || !Object.isExtensible(p) ? p :
          Object.assign(p, { _time: performance.now() - t0 })
      );
      if (typeof result[Symbol.asyncIterator] === "function") {
        for await (const p of result) postHelper(p);
        close();
      }
      if (typeof result !== "undefined") {
        if (!isIterable(result)) result = [result];
        for (const p of result) postHelper(p);
        close();
      }
    }`;
}
```

Three things the shim handles for you:
1. Distinguishes **sync / async / generator / async-generator** functions and streams each yield back.
2. Annotates each posted message with `_time` (ms since the worker started) when the payload is an extensible object.
3. Closes the worker after the last value (or after the generator exits).

## Why this matters for DRExplorer
Exactly the pattern we need. The UMAP Playground uses it to stream live UMAP epochs into a reactive `umapStatus` cell (see `umap-playground-dissection.md`). For DRExplorer we want the same shape across all 7 druid.js algorithms, so we port `worker()` + `workertext()` into `src/lib/worker-helper.js` as a plain ESM module that returns an `AsyncIterable`. Observable Framework consumers use `Generators.observe` on top of the iterable; non-Observable consumers use `for await`.

## Our port (skeleton in `src/lib/worker-helper.js`)
```js
export function runInWorker(fn, arg, { preamble = "", type = "classic", transferList } = {}) {
  const src = buildWorkerSource(fn, preamble);
  const blob = new Blob([src], { type: "text/javascript" });
  return {
    async *[Symbol.asyncIterator]() {
      const url = URL.createObjectURL(blob);
      const w = new Worker(url, { type });
      try {
        const q = [];
        let resolveNext, done = false;
        w.addEventListener("message", e => {
          if (resolveNext) { resolveNext({ value: e.data, done: false }); resolveNext = null; }
          else q.push(e.data);
        });
        w.addEventListener("messageerror", () => { done = true; });
        w.postMessage(arg, transferList);
        while (!done) {
          if (q.length) yield q.shift();
          else yield await new Promise(r => (resolveNext = r)).then(v => v.value);
        }
      } finally {
        w.terminate();
        URL.revokeObjectURL(url);
      }
    },
  };
}
```

Close the iterable when done: in Observable Framework, tie cleanup to `invalidation.then(() => w.terminate())`.

## References
- https://observablehq.com/@fil/worker
- https://observablehq.com/@fil/worker-utility-update
- https://observablehq.com/@fil/umap-js-worker
- https://observablehq.com/@fil/tsne-js-worker
- https://observablehq.com/@fil/plot-worker
- https://observablehq.com/@fil/force-simulation-web-worker
