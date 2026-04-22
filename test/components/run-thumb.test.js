// @vitest-environment node
import { describe, it, expect } from "vitest";
import { fitScales } from "../../src/components/run-thumb.js";

describe("fitScales", () => {
  it("empty input → center-of-canvas fallback without crashing", () => {
    const { sx, sy } = fitScales([], 100, 70);
    expect(sx(999)).toBe(50);
    expect(sy(999)).toBe(35);
  });

  it("single point maps to valid finite coords inside the canvas", () => {
    const { sx, sy } = fitScales([[0.5, 0.5]], 100, 70);
    const x = sx(0.5), y = sy(0.5);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(100);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(70);
  });

  it("bounding box: extreme points land near canvas edges (within pad)", () => {
    const pts = [[0, 0], [10, 10]];
    const { sx, sy } = fitScales(pts, 100, 70, 3);
    // Min x → left pad (3), max x → right pad (100 - 3 = 97)
    expect(sx(0)).toBeCloseTo(3, 5);
    expect(sx(10)).toBeCloseTo(97, 5);
    // Min y → bottom (since we flip), max y → top
    expect(sy(0)).toBeCloseTo(67, 5);   // 70 - 3
    expect(sy(10)).toBeCloseTo(3, 5);
  });

  it("flips the y axis so higher values render higher on screen", () => {
    const pts = [[0, 0], [0, 10]];
    const { sy } = fitScales(pts, 100, 70);
    expect(sy(10)).toBeLessThan(sy(0));
  });

  it("reports extents", () => {
    const { xMin, xMax, yMin, yMax } = fitScales([[-1, 5], [3, -2], [0, 0]], 100, 70);
    expect(xMin).toBe(-1);
    expect(xMax).toBe(3);
    expect(yMin).toBe(-2);
    expect(yMax).toBe(5);
  });
});
