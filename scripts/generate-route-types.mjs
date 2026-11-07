// Initialize Kabsi's actual TanStack Start Vite plugin for route generation.
// The server never listens: config initialization generates routeTree.gen.ts.
import { createServer } from "vite";

const vite = await createServer({
  logLevel: "error",
  server: { middlewareMode: true },
});
await vite.close();
