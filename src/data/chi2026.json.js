// Data loader: emits the CHI 2026 demo dataset as a tidy JSON array.
//
// At build time, Observable Framework runs this script and captures its stdout
// into dist/_file/data/chi2026.json. At runtime the page pulls it via
// FileAttachment("./data/chi2026.json").json().
//
// Source files (see docs/research/chi2026-testbed.md):
//   - <root>/2026_04Apr_10_CHI_2026_program.json                    (titles, authors, tracks)
//   - <root>/2026_04Apr_10_chi2026_embeddings_TitleAbstract.json    (384-dim embeddings)
//   - <root>/2026_04Apr_10_chi2026_umap_TitleAbstract.csv           (precomputed UMAP baseline)
//   - <root>/2026_04Apr_10_chi2026_cluster_topics.json              (6 HDBSCAN cluster labels)
//
// Resolution order for the source directory:
//   1. $CHI2026_DATA_DIR (explicit env var — preferred on CI / someone else's machine).
//   2. ./data/chi2026/ relative to the current working directory (drop the
//      four files there for a zero-config local build).
//   3. Fail with a loud error that tells the user exactly what to do.
//
// Output shape (one record per paper that has an embedding):
//   { id, title, authors, track, cluster, clusterLabel, x, y, embedding: [384 numbers] }

import { promises as fs } from "node:fs";
import path from "node:path";

const PROGRAM_FILE    = "2026_04Apr_10_CHI_2026_program.json";
const EMBED_FILE      = "2026_04Apr_10_chi2026_embeddings_TitleAbstract.json";
const UMAP_FILE       = "2026_04Apr_10_chi2026_umap_TitleAbstract.csv";
const TOPICS_FILE     = "2026_04Apr_10_chi2026_cluster_topics.json";

async function resolveRoot() {
  const candidates = [];
  if (process.env.CHI2026_DATA_DIR) {
    candidates.push({ path: process.env.CHI2026_DATA_DIR, source: "$CHI2026_DATA_DIR" });
  }
  candidates.push({ path: path.join(process.cwd(), "data", "chi2026"), source: "./data/chi2026/" });

  for (const { path: dir, source } of candidates) {
    try {
      await fs.access(path.join(dir, PROGRAM_FILE));
      return dir;
    } catch {
      // try next
    }
  }

  const tried = candidates.map((c) => `  - ${c.source} (${c.path})`).join("\n");
  throw new Error(
    `chi2026 source files not found. Set CHI2026_DATA_DIR to the directory ` +
    `containing ${PROGRAM_FILE}, or place the four source files under ` +
    `./data/chi2026/. Tried:\n${tried}`,
  );
}

const ROOT = await resolveRoot();

async function readJSON(relPath) {
  const full = path.join(ROOT, relPath);
  const raw = await fs.readFile(full, "utf-8");
  return JSON.parse(raw);
}

async function readCSV(relPath) {
  const full = path.join(ROOT, relPath);
  const raw = await fs.readFile(full, "utf-8");
  const [header, ...rows] = raw.trim().split("\n");
  const cols = header.split(",").map((c) => c.trim());
  return rows.map((row) => {
    const cells = row.split(",");
    const o = {};
    for (let i = 0; i < cols.length; i++) {
      const v = cells[i];
      o[cols[i]] = isNaN(+v) || v === "" ? v : +v;
    }
    return o;
  });
}

function embeddingToArray(nested) {
  // nested.data is { "0": 0.003, "1": -0.01, ... }
  const size = nested.size ?? Object.keys(nested.data).length;
  const out = new Array(size);
  for (let i = 0; i < size; i++) out[i] = nested.data[String(i)] ?? 0;
  return out;
}

async function main() {
  const program = await readJSON(PROGRAM_FILE);
  const embeds = await readJSON(EMBED_FILE);
  const umap = await readCSV(UMAP_FILE);
  const topics = await readJSON(TOPICS_FILE);

  // Index by id
  const byId = new Map();
  for (const content of program.contents ?? []) {
    byId.set(content.id, content);
  }
  const umapById = new Map(umap.map((r) => [r.id, r]));

  // Track lookup: program.tracks is an array of {id, name}
  const tracksById = new Map((program.tracks ?? []).map((t) => [t.id, t.name]));

  // Assign each paper to a cluster by matching its UMAP position nearest to
  // a cluster label. The precomputed topics file is keyed by cluster id; since
  // we don't have a per-paper cluster id pre-computed, we leave `cluster`
  // unset for v1 and rely on users to cluster in-browser. `clusterLabel` is
  // just an ordered list of topic strings for reference.
  const clusterLabels = topics;

  const rows = [];
  for (const e of embeds) {
    const content = byId.get(e.id);
    const coords = umapById.get(e.id);
    if (!content || !coords) continue;
    rows.push({
      id: e.id,
      title: content.title ?? "",
      authors: (content.authors ?? []).map((a) => a.name ?? a.fullName ?? a).join(", "),
      track: tracksById.get(content.trackId) ?? content.trackId ?? "",
      x: +coords.x,
      y: +coords.y,
      cluster: null,
      clusterLabel: null,
      embedding: embeddingToArray(e.embedding),
    });
  }

  process.stdout.write(JSON.stringify({
    datasetId: "chi2026",
    name: "CHI 2026 papers (title + abstract)",
    nRows: rows.length,
    nDims: rows[0]?.embedding.length ?? 0,
    clusterLabels,
    rows,
  }));
}

main().catch((err) => {
  // Print to stderr so the build fails loudly with a useful message.
  console.error("[chi2026 loader] failed:", err.message);
  console.error("Set CHI2026_DATA_DIR to point at the chi2026_papers directory.");
  process.exit(1);
});
