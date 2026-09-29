// Lints only the files a pull request changed. The repo was never formatted as a whole (about 40 existing
// errors in src), so a full `npm run lint` is red on main; touching a file means leaving it clean.
import { execFileSync, spawnSync } from "node:child_process";

const base = process.env.BASE_REF || "origin/main";
const changed = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`],
  { encoding: "utf8" },
)
  .split("\n")
  .filter((f) => /\.(m?[jt]s|[jt]sx|cjs)$/.test(f) && /^(src|scripts|tests)\//.test(f));
if (!changed.length) {
  console.log("No lintable files changed.");
  process.exit(0);
}
console.log(`Linting ${changed.length} changed file(s):\n${changed.join("\n")}`);
const r = spawnSync("npx", ["eslint", "--no-warn-ignored", ...changed], { stdio: "inherit" });
process.exit(r.status ?? 1);
