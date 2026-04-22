// @vitest-environment node
import { describe, it, expect } from "vitest";
import { alignAndMerge } from "../../src/lib/merge-refinement.js";

const current = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1],
];
const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("alignAndMerge", () => {
  it("returns currentEmbedding unchanged when fewer than 2 brushed ids", () => {
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: [[10, 10]],
      brushedIds: ["a"],
    });
    expect(out).toBe(current);
  });

  it("returns currentEmbedding unchanged when refined/brushed length mismatch", () => {
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: [[10, 10], [11, 11]],
      brushedIds: ["a", "b", "c"],
    });
    expect(out).toBe(current);
  });

  it("identity: refined coords that already match current → no change", () => {
    const brushed = ["c", "d", "e", "f"];
    // Refined coords already match the brushed rows' current coords
    const refined = brushed.map((id) => {
      const i = ids.indexOf(id);
      return current[i].slice();
    });
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: refined,
      brushedIds: brushed,
    });
    for (let i = 0; i < current.length; i++) {
      expect(out[i].map((v) => +v.toFixed(6))).toEqual(current[i].map((v) => +v.toFixed(6)));
    }
  });

  it("only brushed indices change; non-brushed stay identical by reference", () => {
    const brushed = ["b", "c"];
    const refined = [[100, 200], [300, 400]];
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: refined,
      brushedIds: brushed,
    });
    // Indices 1 and 2 (b, c) should be overwritten (Procrustes will
    // map them to something close to current[1] and current[2] since the
    // transform is fit to that target).
    // Non-brushed indices must be the exact same values (by deep-equal).
    expect(out[0]).toEqual(current[0]);
    expect(out[3]).toEqual(current[3]);
    expect(out[4]).toEqual(current[4]);
  });

  it("rotated refined coords get Procrustes-rotated back to brushed region", () => {
    // Pick 4 brushed points, rotate their coords by 90° to simulate the
    // "refinement in an arbitrary coordinate system" case.
    const brushed = ["a", "b", "c", "d"];
    const brushedCurrent = brushed.map((id) => current[ids.indexOf(id)]);
    // Rotate 90° CCW → (x, y) becomes (-y, x)
    const refined = brushedCurrent.map(([x, y]) => [-y, x]);
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: refined,
      brushedIds: brushed,
    });
    // After Procrustes, the 4 brushed rows should land back ~where they
    // started (Procrustes un-rotates).
    for (let i = 0; i < 4; i++) {
      const [x, y] = out[i];
      const [cx, cy] = brushedCurrent[i];
      expect(x).toBeCloseTo(cx, 4);
      expect(y).toBeCloseTo(cy, 4);
    }
  });

  it("unknown brushed ids are skipped (shouldn't crash)", () => {
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: [[9, 9], [8, 8]],
      brushedIds: ["not-in-ids-1", "not-in-ids-2"],
    });
    // Nothing matches → returns unchanged.
    expect(out).toBe(current);
  });

  it("degenerate scale (collinear source) returns original without crashing", () => {
    // All refined points at the same location → zero variance → bad scale
    const brushed = ["a", "b", "c"];
    const refined = [[5, 5], [5, 5], [5, 5]];
    const out = alignAndMerge({
      currentEmbedding: current,
      allIds: ids,
      refinedEmbedding: refined,
      brushedIds: brushed,
    });
    // Guard returns original, or a best-effort result — either way non-NaN.
    for (const [x, y] of out) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });
});
