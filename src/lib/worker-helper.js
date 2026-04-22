// worker-helper.js — plain-ESM port of @fil/worker.
//
// Given a function (sync, async, generator, or async-generator) and an
// argument, spawns a Blob-URL Web Worker, posts the argument, and returns
// an AsyncIterable whose yields are whatever the function yields or returns.
//
// See docs/research/fil-worker.md for the original implementation and the
// design choices we carry forward (the _time annotation, async-iter detection,
// structured-clone arg passing).
//
// Usage:
//   const status = runInWorker(fit, args, { preamble, type, transferList });
//   for await (const tick of status) { ... }
//
// Observable Framework consumers do:
//   const status = Generators.observe((notify) => {
//     const ac = new AbortController();
//     (async () => { for await (const t of runInWorker(fit, args)) notify(t); })();
//     return () => ac.abort();
//   });

function stringifyFn(f) {
  let g = f.toString();
  if (f.prototype && f.prototype.toString?.() === "[object Generator]") {
    g = g.replace(/function\*?/, "function*");
  }
  return g;
}

function workerSource(fn, preamble = "") {
  const body = typeof fn === "function" ? stringifyFn(fn) : String(fn);
  return `
${preamble}

function __isIterable__(obj) {
  return obj != null &&
    typeof obj[Symbol.iterator] === "function" &&
    typeof obj["next"] === "function";
}

const __run__ = ${body};

self.onmessage = async function (e) {
  const t0 = performance.now();
  try {
    let result = await __run__(e.data);

    const postHelper = (p) => postMessage(
      typeof p !== "object" || p === null || !Object.isExtensible(p)
        ? p
        : Object.assign(p, { _time: performance.now() - t0 })
    );

    if (result != null && typeof result[Symbol.asyncIterator] === "function") {
      for await (const p of result) postHelper(p);
      close();
      return;
    }
    if (typeof result !== "undefined") {
      if (!__isIterable__(result)) result = [result];
      for (const p of result) postHelper(p);
    }
    close();
  } catch (err) {
    postMessage({ __error__: true, message: err?.message ?? String(err), stack: err?.stack });
    close();
  }
};
`;
}

export function runInWorker(fn, arg, options = {}) {
  const { preamble = "", type = "classic", transferList } = options;
  const src = workerSource(fn, preamble);
  const blob = new Blob([src], { type: "text/javascript" });

  return {
    async *[Symbol.asyncIterator]() {
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url, { type });
      const queue = [];
      let waiter = null;
      let done = false;

      const onMessage = (e) => {
        const payload = e.data;
        const isError = payload && payload.__error__;
        if (waiter) {
          const r = waiter;
          waiter = null;
          r.resolve({ value: payload, done: false });
        } else {
          queue.push(payload);
        }
        if (isError) done = true;  // flush error first, then end
      };
      const onError = (ev) => {
        const payload = { __error__: true, message: ev?.message ?? "worker error" };
        if (waiter) {
          const r = waiter;
          waiter = null;
          r.resolve({ value: payload, done: false });
        } else {
          queue.push(payload);
        }
        done = true;
      };
      const onExit = () => {
        done = true;
        waiter?.resolve({ value: undefined, done: true });
        waiter = null;
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.addEventListener("messageerror", onExit);

      try {
        worker.postMessage(arg, transferList);
        while (true) {
          if (queue.length) {
            yield queue.shift();
            continue;
          }
          if (done) return;
          const { value, done: d } = await new Promise((resolve) => (waiter = { resolve }));
          if (d) return;
          yield value;
        }
      } finally {
        worker.terminate();
        URL.revokeObjectURL(url);
      }
    },
  };
}
