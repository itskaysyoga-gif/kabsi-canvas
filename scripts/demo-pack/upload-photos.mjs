// Demo pack (R-125): uploads the placeholder photos made by make-photos.mjs to Storage (bucket owner-photos) as the QA demo
// owner, at the paths the demo pack migration gave the photo rows (<location id>/<photo id>.jpg). Run once after the migration.
// Usage: node scripts/demo-pack/upload-photos.mjs <folder from make-photos.mjs>   (session: tests/e2e/.auth/demo.json)
import { readFileSync } from "node:fs";
const dir = process.argv[2];
const sess = JSON.parse(
  readFileSync(process.env.QA_SESSION_FILE ?? "tests/e2e/.auth/demo.json", "utf8"),
);
const url = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const key = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R"; // the public browser key, no secret
const loc = {
  cafe: "de300000-0000-4000-8000-000000000001",
  salon: "de300000-0000-4000-8000-000000000002",
};
const kind = { cafe: 1, salon: 2 };
const files = {
  cafe: ["c1", "c2", "c3", "c4", "c5", "c6"],
  salon: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
};
for (const biz of ["cafe", "salon"]) {
  for (const [i, f] of files[biz].entries()) {
    const id = `de300000-0000-4000-9000-103` + `00000` + kind[biz] + String(i + 1).padStart(3, "0");
    const res = await fetch(`${url}/storage/v1/object/owner-photos/${loc[biz]}/${id}.jpg`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${sess.access_token}`,
        "content-type": "image/jpeg",
        "x-upsert": "true",
      },
      body: readFileSync(`${dir}/${biz}/${f}.jpg`),
    });
    console.log(biz, f, res.status);
  }
}
