// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  listRuns,
  getRun,
  saveRun,
  deleteRun,
  clearAllRuns,
  exportRuns,
  importRuns,
} from "../../src/lib/run-store.js";

beforeEach(() => {
  localStorage.clear();
});

describe("run-store", () => {
  it("listRuns returns [] when storage is empty", () => {
    expect(listRuns()).toEqual([]);
  });

  it("saveRun persists a run and listRuns returns it sorted newest-first", () => {
    saveRun({
      algo: "UMAP",
      params: { n_neighbors: 15 },
      embedding: [[0, 0], [1, 1]],
      ids: ["a", "b"],
      createdAt: 1000,
    });
    saveRun({
      algo: "PCA",
      params: {},
      embedding: [[2, 2]],
      ids: ["c"],
      createdAt: 2000,
    });
    const runs = listRuns();
    expect(runs).toHaveLength(2);
    expect(runs[0].algo).toBe("PCA"); // newer first
    expect(runs[1].algo).toBe("UMAP");
  });

  it("auto-generates an id when caller omits one", () => {
    const r = saveRun({ algo: "UMAP", embedding: [[0, 0]] });
    expect(r.id).toMatch(/^run_[a-z0-9]+_[a-z0-9]+$/);
  });

  it("auto-generates ids array from embedding length when caller omits it", () => {
    const r = saveRun({ algo: "UMAP", embedding: [[0, 0], [1, 1], [2, 2]] });
    expect(r.ids).toEqual([0, 1, 2]);
  });

  it("saveRun with an existing id updates in place (no duplicate)", () => {
    const first = saveRun({ id: "fixed", algo: "UMAP", embedding: [[0, 0]] });
    saveRun({ id: "fixed", algo: "UMAP", embedding: [[9, 9]] });
    const runs = listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].embedding).toEqual([[9, 9]]);
  });

  it("getRun returns a specific run by id", () => {
    saveRun({ id: "one", algo: "UMAP", embedding: [[0, 0]] });
    saveRun({ id: "two", algo: "PCA", embedding: [[1, 1]] });
    expect(getRun("two").algo).toBe("PCA");
    expect(getRun("missing")).toBeNull();
  });

  it("deleteRun removes a run by id and leaves others", () => {
    saveRun({ id: "keep", algo: "UMAP", embedding: [[0, 0]] });
    saveRun({ id: "drop", algo: "PCA", embedding: [[1, 1]] });
    deleteRun("drop");
    const ids = listRuns().map((r) => r.id);
    expect(ids).toEqual(["keep"]);
  });

  it("clearAllRuns empties storage", () => {
    saveRun({ algo: "UMAP", embedding: [[0, 0]] });
    saveRun({ algo: "PCA", embedding: [[1, 1]] });
    clearAllRuns();
    expect(listRuns()).toEqual([]);
  });

  it("exportRuns produces JSON round-trippable via importRuns", () => {
    saveRun({ id: "a", algo: "UMAP", embedding: [[0, 0]], createdAt: 1000 });
    saveRun({ id: "b", algo: "PCA", embedding: [[1, 1]], createdAt: 2000 });
    const json = exportRuns();
    clearAllRuns();
    const n = importRuns(json, { merge: false });
    expect(n).toBe(2);
    expect(listRuns().map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("importRuns merge=true preserves existing ids and adds new ones", () => {
    saveRun({ id: "existing", algo: "UMAP", embedding: [[0, 0]], createdAt: 1000 });
    const inbound = JSON.stringify([
      { id: "new1", algo: "PCA", embedding: [[1, 1]], ids: [0], metrics: null, createdAt: 2000 },
    ]);
    importRuns(inbound, { merge: true });
    const ids = listRuns().map((r) => r.id).sort();
    expect(ids).toEqual(["existing", "new1"]);
  });
});
