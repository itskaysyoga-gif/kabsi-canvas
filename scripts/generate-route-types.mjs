// Keep route types current before TypeScript checks without hand-editing routeTree.gen.ts.
// The router plugin depends on this pinned generator package.
import { Generator, getConfig } from "@tanstack/router-generator";

const root = process.cwd();
await new Generator({ config: getConfig({}, root), root }).run();
