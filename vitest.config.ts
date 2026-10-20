import { defineConfig } from "vitest/config";

export default defineConfig({
  // The "@/" alias the app uses, so tests can render a component to a string.
  resolve: { alias: { "@": `${process.cwd()}/src` } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
