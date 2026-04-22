// run-store.js — localStorage-backed persistence for DR runs.
//
// A run is:
//   { id, name, datasetId, algo, params, embedding, metrics, createdAt, notes }
//
// embedding = Array<[number, number]>  (array of 2D coords, aligned with the
// dataset rows).  metrics = { trustworthiness?, continuity?, steadiness?, cohesiveness? }
// each { score, localScores (Array<number>), k, n }.
//
// If storage ever exceeds the 5 MB localStorage cap, migrate to IndexedDB via
// idb-keyval. Not needed for Phase 0 (2,769 × 2 floats ≈ 45 KB per run).

const KEY = "drexplorer:runs:v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("[run-store] read failed", err);
    return [];
  }
}

function write(runs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch (err) {
    console.warn("[run-store] write failed (quota?)", err);
  }
}

function uid() {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listRuns() {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function getRun(id) {
  return read().find((r) => r.id === id) ?? null;
}

export function saveRun(run) {
  const runs = read();
  const persisted = {
    id: run.id ?? uid(),
    name: run.name ?? `${run.algo} ${new Date().toLocaleTimeString()}`,
    datasetId: run.datasetId ?? "unknown",
    algo: run.algo,
    params: run.params ?? {},
    embedding: run.embedding ?? [],
    // ids aligns each embedding row with the source dataset row. Required
    // for linked brushing on the compare page (lets us match the "same"
    // point across two runs). Optional; defaults to positional indices.
    ids: run.ids ?? (run.embedding ?? []).map((_, i) => i),
    metrics: run.metrics ?? null,
    notes: run.notes ?? "",
    createdAt: run.createdAt ?? Date.now(),
  };
  const idx = runs.findIndex((r) => r.id === persisted.id);
  if (idx === -1) runs.push(persisted);
  else runs[idx] = persisted;
  write(runs);
  return persisted;
}

export function deleteRun(id) {
  write(read().filter((r) => r.id !== id));
}

export function clearAllRuns() {
  write([]);
}

export function exportRuns() {
  return JSON.stringify(read(), null, 2);
}

export function importRuns(json, { merge = true } = {}) {
  const incoming = typeof json === "string" ? JSON.parse(json) : json;
  if (!Array.isArray(incoming)) throw new Error("Expected an array of runs");
  const current = merge ? read() : [];
  const byId = new Map(current.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id ?? uid(), r);
  write([...byId.values()]);
  return byId.size;
}
