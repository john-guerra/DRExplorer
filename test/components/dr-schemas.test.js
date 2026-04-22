// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  DR_SCHEMAS,
  DR_ALGORITHMS,
  defaultParams,
  COMMON_METRIC_OPTIONS,
} from "../../src/components/dr-schemas.js";

describe("dr-schemas", () => {
  it("includes the 7 v1 algorithms with druid.js-compatible keys", () => {
    // These keys MUST match druid.js's exported class names exactly.
    // ISOMAP is all-caps in druid, everything else matches what you'd
    // expect. Fixing this in Phase 2 was a real bug, so this test
    // guards against regression.
    expect(DR_ALGORITHMS).toEqual(
      expect.arrayContaining(["PCA", "MDS", "ISOMAP", "LLE", "TSNE", "UMAP", "TriMap"]),
    );
    expect(DR_ALGORITHMS).toHaveLength(7);
  });

  it("every schema has an iterative flag + params array", () => {
    for (const algo of DR_ALGORITHMS) {
      const s = DR_SCHEMAS[algo];
      expect(s).toBeTruthy();
      expect(typeof s.iterative).toBe("boolean");
      expect(Array.isArray(s.params)).toBe(true);
      expect(s.params.length).toBeGreaterThan(0);
    }
  });

  it("iterative flag matches druid.js reality", () => {
    expect(DR_SCHEMAS.PCA.iterative).toBe(false);
    expect(DR_SCHEMAS.MDS.iterative).toBe(false);
    expect(DR_SCHEMAS.ISOMAP.iterative).toBe(false);
    expect(DR_SCHEMAS.LLE.iterative).toBe(false);
    expect(DR_SCHEMAS.TSNE.iterative).toBe(true);
    expect(DR_SCHEMAS.UMAP.iterative).toBe(true);
    expect(DR_SCHEMAS.TriMap.iterative).toBe(true);
  });

  it("every param has the required fields", () => {
    for (const algo of DR_ALGORITHMS) {
      for (const p of DR_SCHEMAS[algo].params) {
        expect(p.name, `${algo}:name`).toBeTruthy();
        expect(p.type, `${algo}:type`).toBeTruthy();
        expect(p.default, `${algo}:${p.name}:default`).toBeDefined();
        if (p.type === "select") {
          expect(Array.isArray(p.options), `${algo}:${p.name}:options`).toBe(true);
        }
      }
    }
  });

  it("defaultParams returns an object with every schema field at its default", () => {
    for (const algo of DR_ALGORITHMS) {
      const d = defaultParams(algo);
      for (const p of DR_SCHEMAS[algo].params) {
        expect(d[p.name]).toEqual(p.default);
      }
    }
  });

  it("defaultParams throws on unknown algorithm", () => {
    expect(() => defaultParams("NotAReal")).toThrow(/Unknown algorithm/);
  });

  it("UMAP has the key druid params at documented defaults", () => {
    const d = defaultParams("UMAP");
    // These four are the ones that typically matter for UMAP tuning.
    expect(d.n_neighbors).toBe(15);
    expect(d.min_dist).toBe(0.1);
    expect(d.d).toBe(2);
    expect(d._n_epochs).toBe(350);
  });

  it("COMMON_METRIC_OPTIONS matches the metric functions in dr-worker.js", () => {
    // If you change this list, update DR_WORKER_PREAMBLE in dr-worker.js
    // to expose the same keys on globalThis.drMetrics.
    expect(COMMON_METRIC_OPTIONS).toEqual([
      "euclidean",
      "euclidean_squared",
      "cosine",
      "manhattan",
      "chebyshev",
    ]);
  });
});
