// Repo safety checks (Ops 1 part B, master plan 26.6 and 25.1). Run by CI (npm run check:repo) and by tests/check-repo.test.ts.
//   1. every migration file is named <14 digit timestamp>_<snake_case words>.sql, and no two share a timestamp;
//   2. every skill folder in .claude/skills holds a SKILL.md with frontmatter: a name equal to the folder and a description;
//      every entry in skills-lock.json has its folder;
//   3. every GitHub Action in .github/workflows is pinned to a full 40 character commit SHA (a version comment is welcome);
//   4. package-lock.json is committed (CI and Vercel install with npm ci).
//   5. repository size (Clean 2, 7 Nov 2026): an image, PDF, video or zip is tracked only under src/assets, public, tests/e2e/baseline
//      (the Playwright snapshots), tests/fixtures (inputs a test reads) and docs/email-previews, and no tracked file is over 1 MB
//      (one named exception, below). Session screenshots go to test-results/ or shots/, which are not committed.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function checkMigrations(dir) {
  const problems = [];
  const seen = new Map();
  for (const f of readdirSync(dir).filter((n) => !n.startsWith("."))) {
    if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(f)) {
      problems.push(
        `migration ${f}: the name must be a 14 digit timestamp, an underscore, lower case words with underscores, then .sql`,
      );
      continue;
    }
    const ts = f.slice(0, 14);
    if (seen.has(ts))
      problems.push(`migration ${f}: the timestamp ${ts} is already used by ${seen.get(ts)}`);
    else seen.set(ts, f);
  }
  return problems;
}

export function checkSkills(skillsDir, lockPath) {
  const problems = [];
  const folders = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const name of folders) {
    const file = join(skillsDir, name, "SKILL.md");
    if (!existsSync(file)) {
      problems.push(`skill ${name}: SKILL.md is missing`);
      continue;
    }
    const m = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) {
      problems.push(`skill ${name}: SKILL.md has no frontmatter (--- block) at the top`);
      continue;
    }
    const field = (k) =>
      (m[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m")) ?? [])[1]?.trim().replace(/^["']|["']$/g, "");
    if (field("name") !== name)
      problems.push(
        `skill ${name}: the frontmatter name is "${field("name") ?? ""}", it must equal the folder name`,
      );
    if (!field("description")) problems.push(`skill ${name}: the frontmatter has no description`);
  }
  if (existsSync(lockPath)) {
    for (const name of Object.keys(JSON.parse(readFileSync(lockPath, "utf8")).skills ?? {})) {
      if (!folders.includes(name))
        problems.push(`skills-lock.json lists ${name}, which has no folder in .claude/skills`);
    }
  }
  return problems;
}

export function checkWorkflows(dir) {
  const problems = [];
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
    readFileSync(join(dir, f), "utf8")
      .split("\n")
      .forEach((line, i) => {
        const m = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
        if (!m || m[1].startsWith("./")) return;
        if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(m[1]))
          problems.push(`${f}:${i + 1}: ${m[1]} must be pinned to a full commit SHA`);
      });
  }
  return problems;
}

// Clean 2: the folders that may hold binary media, the size limit and the one file over it.
export const MEDIA_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic|pdf|mp4|m4v|mov|webm|mkv|avi|zip|gz|tgz|7z|rar)$/i;
export const MEDIA_DIRS = ["src/assets/", "public/", "tests/e2e/baseline/", "tests/fixtures/", "docs/email-previews/"];
export const MAX_BYTES = 1024 * 1024;
// Generated font data for the review graphic (supabase/functions/_shared/review-graphic); source code, not media.
export const SIZE_EXCEPTIONS = ["supabase/functions/_shared/review-graphic/assets.ts"];

// files: [{ path, size }] with forward slashes, relative to the repository root.
export function checkFiles(files) {
  const problems = [];
  for (const { path, size } of files) {
    if (MEDIA_RE.test(path) && !MEDIA_DIRS.some((d) => path.startsWith(d)))
      problems.push(
        `${path}: images, PDFs, videos and zips may only be committed under ${MEDIA_DIRS.join(", ")}; write session screenshots to test-results/ or shots/ (not committed)`,
      );
    if (size > MAX_BYTES && !SIZE_EXCEPTIONS.includes(path))
      problems.push(`${path}: ${size} bytes is over the 1 MB limit for one file`);
  }
  return problems;
}

export function trackedFiles(root) {
  const names = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\0")
    .filter(Boolean);
  return names.filter((p) => existsSync(join(root, p))).map((p) => ({ path: p, size: statSync(join(root, p)).size }));
}

export function checkLockfile(root) {
  return existsSync(join(root, "package-lock.json"))
    ? []
    : ["package-lock.json is not committed (CI and Vercel use npm ci)"];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
  const problems = [
    ...checkMigrations(join(root, "supabase/migrations")),
    ...checkSkills(join(root, ".claude/skills"), join(root, "skills-lock.json")),
    ...checkWorkflows(join(root, ".github/workflows")),
    ...checkLockfile(root),
    ...checkFiles(trackedFiles(root)),
  ];
  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log("Repo checks passed: migration names, skills, pinned actions, lockfile, file types and sizes.");
}
