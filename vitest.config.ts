import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    // Default forks/threads pools hang on worker spawn under Node 24; vmThreads is reliable.
    pool: "vmThreads",
  },
});
