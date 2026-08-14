import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Fixture servers are real subprocesses; give them room but never hang CI.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
