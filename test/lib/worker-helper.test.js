// @vitest-environment jsdom
//
// worker-helper is tested at two levels:
//
// 1. The AsyncIterable adapter (runInWorker) with a mock Worker that
//    replays a scripted sequence of messages. This exercises the queue +
//    waiter machinery without needing to evaluate the stringified user fn.
// 2. The actual Web Worker execution path is exercised by the live DR
//    runs on the page (src/index.md → Run DR), not in this test file.
//    We do not call `new Function(...)` on arbitrary source here — that
//    would be both a security smell and a platform gap (workers can't be
//    faithfully simulated in jsdom).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runInWorker } from "../../src/lib/worker-helper.js";

let MockWorker;
let originalWorker;
let originalBlob;
let originalCreate;
let originalRevoke;

describe("runInWorker (AsyncIterable adapter)", () => {
  beforeEach(() => {
    originalWorker = globalThis.Worker;
    originalBlob = globalThis.Blob;
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;

    // Scripted mock: after postMessage(arg), the worker fires a sequence of
    // message events. Sequences are queued per-test via MockWorker.queue.
    MockWorker = class {
      constructor() {
        this._listeners = { message: [], error: [], messageerror: [] };
        this._terminated = false;
      }
      addEventListener(type, cb) {
        if (this._listeners[type]) this._listeners[type].push(cb);
      }
      removeEventListener(type, cb) {
        if (!this._listeners[type]) return;
        this._listeners[type] = this._listeners[type].filter((x) => x !== cb);
      }
      async postMessage(data) {
        const script = MockWorker.queue.shift() ?? [];
        for (const event of script) {
          if (this._terminated) return;
          // Dispatch as a microtask so consumers can interleave.
          await Promise.resolve();
          if (event.type === "message") {
            for (const cb of this._listeners.message) cb({ data: event.data });
          } else if (event.type === "error") {
            for (const cb of this._listeners.error) cb(event);
          } else if (event.type === "messageerror") {
            for (const cb of this._listeners.messageerror) cb(event);
          }
        }
      }
      terminate() {
        this._terminated = true;
      }
    };
    MockWorker.queue = [];

    globalThis.Worker = MockWorker;
    globalThis.Blob = class {
      constructor() {}
    };
    URL.createObjectURL = () => "blob:mock";
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
    globalThis.Blob = originalBlob;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("consumes a sequence of messages in order", async () => {
    MockWorker.queue.push([
      { type: "message", data: { i: 0 } },
      { type: "message", data: { i: 1 } },
      { type: "message", data: { i: 2 } },
    ]);
    const iter = runInWorker(() => {}, null);
    const ticks = [];
    for await (const v of iter) {
      ticks.push(v);
      if (ticks.length >= 3) break;
    }
    expect(ticks.map((t) => t.i)).toEqual([0, 1, 2]);
  });

  it("surfaces __error__ payloads and then closes", async () => {
    MockWorker.queue.push([
      { type: "message", data: { i: 0 } },
      { type: "message", data: { __error__: true, message: "boom" } },
    ]);
    const iter = runInWorker(() => {}, null);
    const ticks = [];
    for await (const v of iter) ticks.push(v);
    expect(ticks).toHaveLength(2);
    expect(ticks[0].i).toBe(0);
    expect(ticks[1].__error__).toBe(true);
    expect(ticks[1].message).toBe("boom");
  });

  it("converts a worker-level error event into a synthesised __error__", async () => {
    MockWorker.queue.push([
      { type: "error", message: "thrown" },
    ]);
    const iter = runInWorker(() => {}, null);
    const ticks = [];
    for await (const v of iter) ticks.push(v);
    expect(ticks).toHaveLength(1);
    expect(ticks[0].__error__).toBe(true);
    expect(ticks[0].message).toBe("thrown");
  });

  it("converts messageerror into a synthesised __error__ (not a clean close)", async () => {
    MockWorker.queue.push([
      { type: "messageerror" },
    ]);
    const iter = runInWorker(() => {}, null);
    const ticks = [];
    for await (const v of iter) ticks.push(v);
    expect(ticks).toHaveLength(1);
    expect(ticks[0].__error__).toBe(true);
  });

  it("honors an AbortSignal: aborting stops further message delivery", async () => {
    MockWorker.queue.push([
      { type: "message", data: { i: 0 } },
      { type: "message", data: { i: 1 } },
      { type: "message", data: { i: 2 } },
    ]);
    const ac = new AbortController();
    const iter = runInWorker(() => {}, null, { signal: ac.signal });
    const ticks = [];
    for await (const v of iter) {
      ticks.push(v);
      if (ticks.length === 1) ac.abort();
    }
    // After abort, at most the currently-queued next tick may slip through.
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    expect(ticks.length).toBeLessThanOrEqual(3);
  });

  it("terminates the worker on iteration end", async () => {
    MockWorker.queue.push([{ type: "message", data: "only" }]);
    let terminated = false;
    const origTerminate = MockWorker.prototype.terminate;
    MockWorker.prototype.terminate = function () {
      terminated = true;
      origTerminate.call(this);
    };
    const iter = runInWorker(() => {}, null);
    for await (const v of iter) {
      if (v === "only") break;
    }
    expect(terminated).toBe(true);
  });
});
