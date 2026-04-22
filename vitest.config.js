import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests live under test/ mirroring src/ (e.g., test/lib/procrustes.test.js).
    include: ["test/**/*.test.js"],
    // jsdom for anything that touches the DOM (widgets). Pure-logic tests
    // can opt out with // @vitest-environment node at the top of the file.
    environment: "jsdom",
    // Our synchronous DR/metrics workers shouldn't take > a second each.
    // If a test approaches this it's a sign we're doing something wrong.
    testTimeout: 5000,
    // Useful defaults.
    globals: false,
    reporters: ["default"],
  },
});
