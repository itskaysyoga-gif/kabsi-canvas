// Guides 4 part C (master plan 30.32 item 4): tells IndexNow which kabsi.co addresses were published or changed.
//   node scripts/indexnow.mjs --deploy <previous sha> <this sha>   after a production deploy: the pages whose files changed
//   node scripts/indexnow.mjs --daily                              every morning: the guides that became public in the last 24 hours
//   add --dry to print what would be sent and send nothing.
// It logs the response code and never fails: a problem here must never stop a deploy, so the exit code is always 0.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  ENDPOINT,
  KEY_LOCATION,
  INDEXNOW_KEY,
  changedUrls,
  guidePublishTimes,
  payload,
  publishedToday,
} from "./lib/indexnow-lib.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const now = new Date();

async function main() {
  const guides = await guidePublishTimes();
  let urls = [];
  if (args.includes("--daily")) {
    urls = publishedToday({ guides, now });
  } else if (args.includes("--deploy")) {
    const [before, after] = args.slice(args.indexOf("--deploy") + 1, args.indexOf("--deploy") + 3);
    if (!before || !after) throw new Error("--deploy needs the previous and this commit");
    const changedFiles = execFileSync("git", ["diff", "--name-only", before, after], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    const pages = JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8"));
    urls = changedUrls({ changedFiles, pages, guides, now });
    console.log(
      `${changedFiles.length} files changed between ${before.slice(0, 7)} and ${after.slice(0, 7)}.`,
    );
  } else {
    throw new Error("use --deploy <before> <after> or --daily");
  }
  if (!urls.length) {
    console.log("IndexNow: nothing to send.");
    return;
  }
  console.log(`IndexNow: ${urls.length} address(es):\n${urls.join("\n")}`);
  if (dry) return;
  // The key file must be readable where IndexNow will look for it. Logged, never a stop.
  try {
    const k = await fetch(KEY_LOCATION);
    const body = (await k.text()).trim();
    console.log(
      `Key file ${KEY_LOCATION}: HTTP ${k.status}, ${body === INDEXNOW_KEY ? "matches" : "does not match"}.`,
    );
  } catch (e) {
    console.log(`Key file not read: ${e.message}`);
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload(urls)),
  });
  // 200 and 202 are accepted; 400 bad request, 403 key not valid, 422 addresses do not belong to the host, 429 too many.
  console.log(`IndexNow response: HTTP ${res.status} ${res.statusText}`);
}

try {
  await main();
} catch (e) {
  console.log(`IndexNow: not sent (${e.message}).`);
}
process.exit(0);
