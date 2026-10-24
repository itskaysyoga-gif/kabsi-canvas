// Uploads the web build's source maps to Sentry under the release tag the app reports (Ops 1 part B, master plan 29.9).
// Runs after `npm run build` in the Vercel build command (vercel.json). The release is the commit Vercel builds
// (VERCEL_GIT_COMMIT_SHA), the same value vite.config.ts bakes into the app as __KABSI_RELEASE__, so an error in Sentry
// shows readable code for exactly the deploy it came from.
//
//   SENTRY_AUTH_TOKEN   Vercel env, Production only, never in the repository. Without it this script does nothing.
//   SENTRY_URL, SENTRY_ORG, SENTRY_PROJECT   not secrets; the defaults below are Kabsi's (EU region).
//
// Only a production build uploads. Whatever the environment, the maps are removed from the build output afterwards, so
// they are never served to visitors. A failed upload is reported loudly but does not fail the deploy: monitoring must
// never take the site down.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const CLI = "@sentry/cli@3.8.2";
const dryRun = process.argv.includes("--dry-run");

export function plan(env, dirs = [".vercel/output/static", ".output/public"]) {
  const dir = dirs.find((d) => existsSync(d));
  if (!env.SENTRY_AUTH_TOKEN)
    return { skip: "SENTRY_AUTH_TOKEN is not set, so no source maps were made or uploaded." };
  if (!dir) return { skip: "no build output was found.", dir: null };
  const release = env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA;
  const upload = env.VERCEL_ENV === "production" || env.SENTRY_UPLOAD === "1";
  if (!upload || !release)
    return {
      dir,
      release,
      upload: false,
      skip: "not a production build, so the maps are only removed.",
    };
  const base = ["--yes", CLI];
  return {
    dir,
    release,
    upload: true,
    commands: [
      [...base, "releases", "new", release],
      [...base, "sourcemaps", "inject", dir],
      [...base, "sourcemaps", "upload", "--release", release, "--url-prefix", "~/", dir],
      [...base, "releases", "finalize", release],
    ],
  };
}

function removeMaps(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) n += removeMaps(p);
    else if (name.endsWith(".map")) {
      rmSync(p);
      n += 1;
    }
  }
  return n;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const p = plan(process.env);
  console.log(`Sentry source maps: ${p.skip ?? `release ${p.release}`}`);
  if (p.commands) {
    if (dryRun) for (const c of p.commands) console.log(`  npx ${c.join(" ")}`);
    else {
      const env = {
        ...process.env,
        SENTRY_URL: process.env.SENTRY_URL ?? "https://de.sentry.io",
        SENTRY_ORG: process.env.SENTRY_ORG ?? "google-nfc-card-dl",
        SENTRY_PROJECT: process.env.SENTRY_PROJECT ?? "kabsi-web",
      };
      try {
        for (const c of p.commands) execFileSync("npx", c, { stdio: "inherit", env });
        console.log("Sentry source maps: uploaded.");
      } catch (e) {
        console.log(
          `::warning::Sentry source maps were NOT uploaded (${String(e.message).slice(0, 120)}). The deploy goes on; errors will show minified code until the next deploy.`,
        );
      }
    }
  }
  if (p.dir && !dryRun)
    console.log(`Sentry source maps: ${removeMaps(p.dir)} map files removed from the output.`);
}
