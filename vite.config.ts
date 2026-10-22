// Vite config for the Kabsi website and app (TanStack Start). Vercel builds it with the Nitro "vercel" preset.
// src/server.ts is the SSR error wrapper (TanStack Start's server entry is redirected to it).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  // The Sentry release tag for the web build (P0.6-08, K-118): the commit Vercel builds, so an error names its deploy.
  define: {
    __KABSI_RELEASE__: JSON.stringify(
      process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "dev",
    ),
  },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build" ? [nitro(process.env["VERCEL"] ? { preset: "vercel" } : {})] : []),
    viteReact(),
  ],
}));
