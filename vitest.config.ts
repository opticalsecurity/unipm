import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/tests/**/*.ts",
        "src/types/**/*.ts",
        "src/cli/index.ts",
        "src/scripts/**/*.ts",
      ],
    },
  },
});
