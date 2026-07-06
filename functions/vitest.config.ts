import { defineConfig } from "vitest/config";

// Node environment: these are server-side functions, no DOM. Tests exercise the
// trigger logic against a fake Firestore (see test/fakeFirestore.ts) rather than
// a live emulator — Java 1.8 on the build machine is too old to boot the
// Firestore emulator, so emulator-based integration runs in CI only.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
