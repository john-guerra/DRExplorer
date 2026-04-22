// @vitest-environment node
import { describe, it, expect } from "vitest";
import { procrustes } from "../../src/lib/procrustes.js";

const SQUARE = [[0, 0], [1, 0], [0, 1], [1, 1]];

describe("procrustes", () => {
  it("identity: same src and dst → identity rotation, scale 1, zero translation", () => {
    const a = procrustes(SQUARE, SQUARE);
    expect(a.n).toBe(4);
    expect(a.rotation.map((v) => +v.toFixed(6))).toEqual([1, 0, 0, 1]);
    expect(a.scale).toBeCloseTo(1, 6);
    expect(a.translation.map((v) => +v.toFixed(6))).toEqual([0, 0]);
    expect(a.apply(0.5, 0.5).map((v) => +v.toFixed(6))).toEqual([0.5, 0.5]);
  });

  it("90° CCW rotation: sends (1,0) → (0,1) and (0,1) → (-1,0)", () => {
    const rotated = SQUARE.map(([x, y]) => [-y, x]);
    const a = procrustes(SQUARE, rotated);
    const r = a.rotation.map((v) => +v.toFixed(6));
    // 90° CCW as a column-vector rotation: [[0, -1], [1, 0]]
    expect(r).toEqual([0, -1, 1, 0]);
    expect(a.scale).toBeCloseTo(1, 6);
    expect(a.apply(1, 0).map((v) => +v.toFixed(6))).toEqual([0, 1]);
    expect(a.apply(0, 1).map((v) => +v.toFixed(6))).toEqual([-1, 0]);
  });

  it("2× scale: rotation identity, scale exactly 2", () => {
    const doubled = SQUARE.map(([x, y]) => [2 * x, 2 * y]);
    const a = procrustes(SQUARE, doubled);
    expect(a.scale).toBeCloseTo(2, 6);
    expect(a.apply(1, 1).map((v) => +v.toFixed(6))).toEqual([2, 2]);
  });

  it("90° CCW + translation: sends (1,0) → (3,6), (0,1) → (2,5)", () => {
    const transformed = SQUARE.map(([x, y]) => [3 - y, 5 + x]);
    const a = procrustes(SQUARE, transformed);
    expect(a.scale).toBeCloseTo(1, 6);
    expect(a.apply(1, 0).map((v) => +v.toFixed(6))).toEqual([3, 6]);
    expect(a.apply(0, 1).map((v) => +v.toFixed(6))).toEqual([2, 5]);
  });

  it("throws on < 2 points", () => {
    expect(() => procrustes([[0, 0]], [[1, 1]])).toThrow(/at least 2/);
  });

  it("handles reflection-requested case gracefully (rotation-only has residual)", () => {
    // (x, y) → (x, -y) is a reflection; rotation-only procrustes finds the
    // best rotation (identity or 180°), not a reflection. This documents
    // the behaviour rather than asserting correctness of reflection.
    const reflected = SQUARE.map(([x, y]) => [x, -y]);
    const a = procrustes(SQUARE, reflected);
    // Scale stays finite and within a reasonable range.
    expect(Number.isFinite(a.scale)).toBe(true);
    expect(a.scale).toBeGreaterThanOrEqual(-2);
    expect(a.scale).toBeLessThanOrEqual(2);
  });
});
