import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts on purpose: these tests need the Firestore
// emulator (via `firebase emulators:exec`, see package.json "test:rules") and
// are much slower than the jsdom unit suite. Keeping them in their own config
// means `npm test` never spins up the emulator and stays fast.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["rules-tests/**/*.test.ts"],
    // Rules-unit-testing opens real sockets to the emulator; running test
    // files one at a time avoids port/state contention on the shared project.
    pool: "forks",
    fileParallelism: false,
    // Emulator round-trips are slower than in-memory unit tests.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
