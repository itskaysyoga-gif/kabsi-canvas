// CI guard (D295). Functions the browser calls without a session have verify_jwt on, so every such call must send
// the public anon JWT. This checks that src/lib/supabase.ts exports anonHeaders and that each call site below
// imports it and uses it near every fetch to that function. Text based on purpose: it is a tripwire, not a parser.
import { readFileSync } from "node:fs";

const SITES = [
  { fn: "api", file: "src/lib/reviews.ts", target: /functions\/v1\/api\/action/ },
  {
    fn: "assistant",
    file: "src/components/assistant/assistant-widget.tsx",
    target: /\bENDPOINT\b/,
  },
  { fn: "lead", file: "src/routes/partners.tsx", target: /functions\/v1\/lead/ },
  {
    fn: "review-link",
    file: "src/routes/google-review-link.tsx",
    target: /functions\/v1\/review-link/,
  },
];
const WINDOW = 10; // lines before and after a fetch( that may carry the headers

const problems = [];
const read = (f) => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    problems.push(`${f}: file not found`);
    return null;
  }
};

const lib = read("src/lib/supabase.ts");
if (lib && !/export\s+const\s+anonHeaders\b/.test(lib))
  problems.push("src/lib/supabase.ts does not export anonHeaders");

for (const { fn, file, target } of SITES) {
  const src = read(file);
  if (!src) continue;
  const lines = src.split("\n");
  if (!/import\s*\{[^}]*\banonHeaders\b[^}]*\}\s*from\s*["']@\/lib\/supabase["']/.test(src)) {
    problems.push(`${file} (${fn}): does not import anonHeaders from @/lib/supabase`);
  }
  let calls = 0;
  lines.forEach((line, i) => {
    if (!/\bfetch\(/.test(line)) return;
    const head = lines.slice(i, i + 4).join("\n");
    if (!target.test(head)) return;
    calls++;
    const around = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
    if (!/\banonHeaders\b/.test(around))
      problems.push(`${file}:${i + 1} (${fn}): fetch sends no anonHeaders`);
  });
  if (!calls)
    problems.push(
      `${file} (${fn}): no fetch to ${fn} found; update SITES in scripts/check-anon-headers.mjs if the call moved`,
    );
}

if (problems.length) {
  console.error("Anon JWT check failed (D295):\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(
  `Anon JWT check ok: anonHeaders exported and used by ${SITES.map((s) => s.fn).join(", ")}.`,
);
