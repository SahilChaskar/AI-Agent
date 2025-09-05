import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    globalSetup: "./globalSetup.ts",
    setupFiles: ["./testSetup.ts"],
    include: ["src/**/*.test.ts"],
    testTimeout: 60000,
  },
});
