// Repo safety checks (Ops 1 part B, master plan 26.6 and 25.1). Run by CI (npm run check:repo) and by tests/check-repo.test.ts.
//   1. every migration file is named <14 digit timestamp>_<snake_case words>.sql, and no two share a timestamp;
//   2. every skill folder in .claude/skills holds a SKILL.md with frontmatter: a name equal to the folder and a description;
//      every entry in skills-lock.json has its folder;
//   3. every GitHub Action in .github/workflows is pinned to a full 40 character commit SHA (a version comment is welcome);
//   4. package-lock.json is committed (CI and Vercel install with npm ci).
//   5. repository size (Clean 2, 7 Nov 2026; tightened by Clean 4, 10 Nov): an image, PDF, video or zip is tracked only under
//      src/assets, public, tests/e2e/baseline (the Playwright snapshots) and tests/fixtures (inputs a test reads), never under
//      docs/, and no tracked file is over 300 KB except the baselines and the named list (each with its reason) below.
//      Session screenshots go to test-results/ or shots/, which are not committed.
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

// Clean 2 and Clean 4: the folders that may hold binary media, the size limit and the files allowed over it.
export const MEDIA_RE =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic|pdf|mp4|m4v|mov|webm|mkv|avi|zip|gz|tgz|7z|rar)$/i;
// Clean 4 (10 Nov 2026): docs/ holds no image, PDF, video or zip at all (docs/email-previews is HTML and text only).
export const MEDIA_DIRS = ["src/assets/", "public/", "tests/e2e/baseline/", "tests/fixtures/"];
// Clean 4: no tracked file over 300 KB, except the Playwright baselines (screenshots the visual tests compare against)
// and the files named below, each with the reason it may be large. A file that falls under the limit is removed from the
// list. A file that is not yet over the limit but only grows (the master plan, the built facts) is named now so a content
// pull request does not trip the guard. Evidence screenshots are looked at in the session, never committed.
export const MAX_BYTES = 300 * 1024;
export const BASELINE_DIR = "tests/e2e/baseline/";
export const SIZE_ALLOWLIST = {
  "supabase/functions/_shared/review-graphic/assets.ts":
    "generated font and wasm data (base64) for the review graphic; source code, rebuilt as the comment at its top says",
  "docs/COPY.md": "the copy deck: the one file that holds every approved line (CLAUDE.md names it)",
  "docs/KABSI-MASTERPLAN.md":
    "the master plan, the always-read core (CLAUDE.md names it); one file by design, it only grows",
  "docs/progress/archive/evidence.md":
    "archived evidence of the early sessions, word for word; never edited",
  "knowledge/kabsi-facts.md":
    "built by scripts/build-kb.mjs from knowledge/facts; the one file Nora reads",
  "public/llms-full.txt":
    "built by scripts/build-kb.mjs from knowledge/facts; the facts for AI search, served as is",
  "public/og/about.png":
    "share image, 1200 by 630 PNG made by scripts/og.mjs; some link previews skip WebP",
  "public/og/industry.png":
    "share image, 1200 by 630 PNG made by scripts/og.mjs; some link previews skip WebP",
  "public/help/manager-steps/desktop/step-1-open-profile.png":
    "the first screenshot of the Add Kabsi as a Manager guide (src/lib/manager-guide.ts); a full desktop screenshot",
};

// files: [{ path, size }] with forward slashes, relative to the repository root.
export function checkFiles(files) {
  const problems = [];
  for (const { path, size } of files) {
    if (MEDIA_RE.test(path) && path.startsWith("docs/"))
      problems.push(
        `${path}: docs/ holds no images, PDFs, videos or zips; evidence screenshots are looked at in the session and never committed (write them to test-results/ or shots/)`,
      );
    else if (MEDIA_RE.test(path) && !MEDIA_DIRS.some((d) => path.startsWith(d)))
      problems.push(
        `${path}: images, PDFs, videos and zips may only be committed under ${MEDIA_DIRS.join(", ")}; write session screenshots to test-results/ or shots/ (not committed)`,
      );
    if (size > MAX_BYTES && !path.startsWith(BASELINE_DIR) && !(path in SIZE_ALLOWLIST))
      problems.push(
        `${path}: ${size} bytes is over the 300 KB limit for one file (only the Playwright baselines and the named list in scripts/check-repo.mjs may be larger)`,
      );
  }
  return problems;
}

export function trackedFiles(root) {
  const names = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean);
  return names
    .filter((p) => existsSync(join(root, p)))
    .map((p) => ({ path: p, size: statSync(join(root, p)).size }));
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
  console.log(
    "Repo checks passed: migration names, skills, pinned actions, lockfile, file types and sizes.",
  );
}
