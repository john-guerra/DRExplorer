// Parameter schemas for the seven v1 DR algorithms.
// Each schema is an array of {name, type, default, min, max, step, options, description, advanced}.
// See docs/research/dr-algorithms.md for intuition and docs/research/druid-js.md for defaults.

export const COMMON_METRIC_OPTIONS = [
  "euclidean",
  "euclidean_squared",
  "cosine",
  "manhattan",
  "chebyshev",
];

export const DR_SCHEMAS = {
  PCA: {
    label: "PCA",
    iterative: false,
    params: [
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
    ],
  },
  MDS: {
    label: "MDS",
    iterative: false,
    params: [
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "metric", type: "select", default: "euclidean", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
    ],
  },
  Isomap: {
    label: "Isomap",
    iterative: false,
    params: [
      { name: "neighbors", type: "int", default: 10, min: 2, max: 50, step: 1, description: "k for the kNN graph" },
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "metric", type: "select", default: "euclidean", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
    ],
  },
  LLE: {
    label: "LLE",
    iterative: false,
    params: [
      { name: "neighbors", type: "int", default: 10, min: 2, max: 50, step: 1, description: "k neighbors" },
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "metric", type: "select", default: "euclidean", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
    ],
  },
  TSNE: {
    label: "t-SNE",
    iterative: true,
    params: [
      { name: "perplexity", type: "float", default: 30, min: 5, max: 100, step: 1, description: "Effective number of neighbors" },
      { name: "epsilon", type: "float", default: 10, min: 1, max: 200, step: 1, description: "Learning rate" },
      { name: "iterations", type: "int", default: 500, min: 100, max: 2000, step: 50, description: "Gradient-descent steps" },
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "metric", type: "select", default: "euclidean_squared", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
      { name: "seed", type: "int", default: 1212, min: 0, max: 99999, step: 1, description: "Random seed" },
    ],
  },
  UMAP: {
    label: "UMAP",
    iterative: true,
    params: [
      { name: "n_neighbors", type: "int", default: 15, min: 2, max: 50, step: 1, description: "Local vs global balance" },
      { name: "min_dist", type: "float", default: 0.1, min: 0.001, max: 1.0, step: 0.01, description: "Min separation in LD" },
      { name: "spread", type: "float", default: 1.0, min: 0.1, max: 3.0, step: 0.05, description: "LD scale" },
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "_n_epochs", type: "int", default: 350, min: 50, max: 1000, step: 50, description: "Epochs", advanced: true },
      { name: "_initial_alpha", type: "float", default: 1.0, min: 0.1, max: 5.0, step: 0.1, description: "Initial learning rate", advanced: true },
      { name: "_negative_sample_rate", type: "int", default: 5, min: 1, max: 20, step: 1, description: "Negative samples per edge", advanced: true },
      { name: "_repulsion_strength", type: "float", default: 1.0, min: 0.0, max: 5.0, step: 0.1, description: "Repulsion weight", advanced: true },
      { name: "_set_op_mix_ratio", type: "float", default: 1.0, min: 0.0, max: 1.0, step: 0.05, description: "Fuzzy simplicial set mix", advanced: true },
      { name: "local_connectivity", type: "int", default: 1, min: 1, max: 5, step: 1, description: "Local connectivity", advanced: true },
      { name: "metric", type: "select", default: "euclidean", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
      { name: "seed", type: "int", default: 1212, min: 0, max: 99999, step: 1, description: "Random seed" },
    ],
  },
  TriMap: {
    label: "TriMap",
    iterative: true,
    params: [
      { name: "n_inliers", type: "int", default: 10, min: 2, max: 50, step: 1, description: "Inlier triplets per point" },
      { name: "n_outliers", type: "int", default: 5, min: 1, max: 20, step: 1, description: "Outlier triplets per point" },
      { name: "n_random", type: "int", default: 5, min: 0, max: 20, step: 1, description: "Random triplets per point" },
      { name: "d", type: "int", default: 2, min: 1, max: 10, step: 1, description: "Output dimensions" },
      { name: "metric", type: "select", default: "euclidean", options: COMMON_METRIC_OPTIONS, description: "Distance metric" },
      { name: "seed", type: "int", default: 1212, min: 0, max: 99999, step: 1, description: "Random seed" },
    ],
  },
};

export function defaultParams(algo) {
  const schema = DR_SCHEMAS[algo];
  if (!schema) throw new Error(`Unknown algorithm: ${algo}`);
  return Object.fromEntries(schema.params.map((p) => [p.name, p.default]));
}

export const DR_ALGORITHMS = Object.keys(DR_SCHEMAS);
