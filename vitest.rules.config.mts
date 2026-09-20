import { defineConfig } from "vitest/config";

/**
 * Security-rule tests run against the Firebase emulator, so they are kept out
 * of the default unit-test project — `npm test` must stay runnable with no
 * emulator on the machine.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
