// Screenshot pack: QA demo owner only, never presses a button that submits, approves, publishes, sends, pays or connects.
// Usage: [PAGES=home,reviews] [SUFFIX=-b] node scripts/demo-pack/screenshot-pack.mjs <business-id> <business-slug> <390|1440> <outdir>
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const [, , bizId, slug, widthArg, out] = process.argv;
const width = +widthArg;
const SESS = readFileSync(process.env.QA_SESSION_FILE ?? "tests/e2e/.auth/demo.json", "utf8");
mkdirSync(out, { recursive: true });

const DENY =
  /approve|publish|send|submit|pay|connect|skip|save|post it|put my|do it|later|remove|cancel|delete|confirm|^yes|invite|disconnect|upgrade|checkout|choose plan|report this|make a link|create|generate|activate|undo|request|log out|sign out|check my website|ask for a neutral|the new .* are right|don.t post|don.t pick|reply myself|talk to|answer on whatsapp|open whatsapp|forward on whatsapp|copy|download|take a photo|choose photos|send a photo|refresh|start|decide|mark|keep|not right|yes, delete|plans open soon|review$/i;
const ALLOW_POST = [
  /\/auth\/v1\/token/,
  /\/functions\/v1\/(insights|coach)/,
  /\/storage\/v1\/object\/sign/,
  /\/rest\/v1\/rpc\/(plan_summary|list_tasks|holiday_calendar|entitlements|feature_access|activity_feed|my_notification_prefs|list_my_notifications|coach_checklist|is_staff|google_mode|onboarding_status|whatsapp_status|whatsapp_owners_on|list_review_reports|photo_link_status|my_setup_link_emailed|claim_team_invites|my_access|list_team|whatsapp_connect_start|my_routine_delivery|routine_channels|whatsapp_staff_code|is_member|my_role)/,
];
const blocked = [];
const skipped = new Set();
const files = [];

const pages = [
  ["home", "/app", "Home: what needs your yes, what needs attention and what Kabsi did this week"],
  [
    "reviews",
    "/app/reviews",
    "Reviews, Waiting view: every review that needs a reply with its status",
  ],
  [
    "posts",
    "/app/posts",
    "Posts tab: this month's post drafts, scheduled posts and the write-a-post form",
  ],
  ["photos", "/app/photos", "Photos tab: photos ready, sent to Google and the team photo link"],
  [
    "hours",
    "/app/hours",
    "Google profile, Hours tab: usual hours, the holiday question and special days",
  ],
  [
    "shield",
    "/app/shield",
    "Google profile, Profile watch tab: changes others made, the details Kabsi watches, things to fix",
  ],
  [
    "coach",
    "/app/coach",
    "Google profile, Profile Coach tab: the checklist and what Kabsi can do for you",
  ],
  [
    "insights",
    "/app/insights",
    "Google profile, Where you show up tab: map check, AI answer, competitors and Google figures",
  ],
  [
    "settings",
    "/app/settings",
    "Settings, General tab: business, where messages go and notification choices",
  ],
  [
    "knowledge",
    "/app/knowledge",
    "Settings, Business knowledge tab: the facts replies and posts use",
  ],
  ["team", "/app/team", "Settings, Team tab: owners, invitations and who can approve"],
  ["plan", "/app/plan", "Settings, Plan tab: the current plan and the plans and prices"],
  ["report", "/app/report", "Settings, Reports tab: the weekly report and earlier weeks"],
  [
    "cards",
    "/app/cards",
    "Reviews, Get reviews: the ready message, QR code, review card and link opens",
  ],
  ["start", "/start", "Get set up: the onboarding stage this account is on"],
];

// [state, description, finder(page) -> locator, mode]. Only reads: each opens something that changes nothing until a save button.
const R = (re) => (p) => p.getByRole("button", { name: re }).first();
const T = (re) => (p) => p.getByText(re).first();
const L = (re) => (p) => p.getByRole("link", { name: re }).first();
const SUM = (re) => (p) => p.locator("summary", { hasText: re }).first();
const COMMON = [
  ["business-menu", "The business switcher sheet", R(/switch business/i), "view"],
  ["account-menu", "The account and help menu", R(/your account and help/i), "view"],
];
const BY_PAGE = {
  home: [
    ["details-open", "The first card's Details opened", R(/^Details$/), "full"],
    ["edit-reply", "The reply editor on the first review card (nothing saved)", R(/^Edit/), "full"],
  ],
  reviews: [
    [
      "on-google",
      "On Google view: replies Kabsi has read back from Google",
      T(/^(On Google|Live on Google)$/),
      "full",
    ],
    [
      "all",
      "All reviews: every review with its status (See all reviews)",
      T(/^See all reviews$/),
      "full",
    ],
    ["edit-reply", "The reply editor (nothing saved)", R(/^Edit$/), "full"],
    ["other-options", "Other options menu on a reply", R(/^Other options$/), "full"],
  ],
  posts: [
    ["edit-post", "The post editor on the first draft (nothing saved)", R(/^Edit$/), "full"],
    ["december", "December 2026 tab", T(/^December 2026$/), "full"],
    ["offer-form", "Write a post: Offer fields", T(/^Offer$/), "full"],
    ["event-form", "Write a post: Event fields", T(/^Event$/), "full"],
  ],
  photos: [["open-photo", "A sent photo opened full size", (p) => p.locator("img").nth(6), "view"]],
  hours: [
    ["change-hours", "Change hours form (nothing saved)", R(/^Change hours$/), "full"],
    [
      "custom-hours",
      "Holiday question with Custom hours chosen (not confirmed)",
      T(/^Custom hours$/),
      "full",
    ],
    [
      "closed-for-a-while",
      "Closed for a while form (nothing saved)",
      R(/^Closed for a while$/),
      "full",
    ],
  ],
  shield: [
    [
      "something-else",
      "Something else: tell Kabsi about another problem",
      R(/something else/i),
      "view",
    ],
  ],
  coach: [
    [
      "categories-ticked",
      "Add more categories: one category ticked (nothing reviewed or sent)",
      (p) => p.getByRole("checkbox").first(),
      "full",
    ],
    ["snippet", "A snippet for your website", R(/show the snippet/i), "full"],
  ],
  insights: [
    [
      "detailed-results",
      "Detailed results: the 49 checked places",
      SUM(/detailed results/i),
      "full",
    ],
    ["google-details", "Google figures: See details", SUM(/see details/i), "full"],
  ],
  knowledge: [
    ["edit-fact", "Editing a fact (nothing saved)", R(/^Edit$/), "full"],
    ["add-fact", "Adding a fact (nothing saved)", R(/^Add$/), "full"],
  ],
  team: [
    ["choose-per-kind", "Approvals: choose for each kind", SUM(/choose for each kind/i), "full"],
  ],
  plan: [["yearly", "Yearly prices", T(/Yearly, 2 months free/), "full"]],
  report: [
    [
      "earlier-weeks",
      "An earlier week opened",
      (p) => p.locator("details summary").first(),
      "full",
    ],
  ],
  cards: [],
  start: [["need-a-hand", "Need a hand? opened", R(/need a hand/i), "view"]],
};

const browser = await chromium.launch();
const mk = async () => {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 800 ? 844 : 900 },
    deviceScaleFactor: 1,
    locale: "en-US",
    isMobile: width < 800,
    hasTouch: width < 800,
  });
  await ctx.addInitScript(
    ([k, v, l]) => {
      try {
        localStorage.setItem(k, v);
        localStorage.setItem("kabsi.location", l);
      } catch {}
    },
    ["sb-ynjdqjlmdwjgbfezevxy-auth-token", SESS, bizId],
  );
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const m = req.method();
    const u = req.url();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.continue();
    if (/supabase\.co|kabsi\.co/.test(u) && !ALLOW_POST.some((re) => re.test(u))) {
      blocked.push(`${m} ${u.replace(/\?.*/, "").slice(0, 110)}`);
      return route.abort();
    }
    return route.continue();
  });
  return ctx;
};
const settle = async (p) => {
  await p.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(900);
};
const snap = async (p, page, state, desc, mode) => {
  const f = `${slug}-${width}-${page}-${state}.png`;
  if (mode === "view") await p.screenshot({ path: `${out}/${f}` });
  else {
    // One tall viewport, so the sticky header, the bottom bar and the sidebar sit where a person sees them, not mid-page.
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    const vh = p.viewportSize().height;
    await p.setViewportSize({ width, height: Math.min(Math.max(h, vh), 9000) });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${f}`, fullPage: true });
    await p.setViewportSize({ width, height: vh });
  }
  files.push({ file: f, desc: `${desc}.` });
};
const visit = async (p, path) => {
  await p.goto("https://kabsi.co" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(p);
};

const ctx = await mk();
const p = await ctx.newPage();
const ONLY = (process.env.PAGES ?? "").split(",").filter(Boolean);
for (const [page, path, desc] of pages) {
  if (ONLY.length && !ONLY.includes(page)) continue;
  await visit(p, path);
  if (page === "start" && !p.url().includes("/start")) {
    files.push({ file: "-", desc: `start redirected to ${p.url()}` });
  }
  await snap(p, page, "default", desc, "full");
  // buttons and links this page offers that the pack never presses
  for (const t of await p
    .locator("button, a[role=button]")
    .allInnerTexts()
    .catch(() => [])) {
    const s = t.trim().replace(/\s+/g, " ");
    if (s && s.length < 60 && DENY.test(s)) skipped.add(`${page}: ${s}`);
  }
  const list = [...(page === "start" ? [] : COMMON), ...(BY_PAGE[page] ?? [])];
  for (const [state, d, find, mode] of list) {
    try {
      await visit(p, path);
      const el = find(p);
      await el.waitFor({ timeout: 5000 }).catch(() => {});
      if (!(await el.count())) {
        skipped.add(`${page}/${state}: not on this page for this business`);
        continue;
      }
      const label = (
        (await el.innerText({ timeout: 3000 }).catch(() => "")) ||
        (await el.getAttribute("aria-label").catch(() => "")) ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ");
      if (
        label &&
        DENY.test(label) &&
        !/^(Edit|Details|Other options|Review|Add|Change hours|Closed for a while|Custom hours|See details|Detailed results)$/i.test(
          label,
        ) &&
        !/switch business|account and help|print a counter|show the snippet|need a hand|something else|choose for each kind|^$/i.test(
          label,
        )
      ) {
        skipped.add(`${page}/${state}: "${label}" is on the deny list`);
        continue;
      }
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click({ timeout: 8000 });
      await p.waitForTimeout(1100);
      await snap(p, page, state, d, mode);
      await p.keyboard.press("Escape").catch(() => {});
    } catch (e) {
      skipped.add(
        `${page}/${state}: could not open (${String(e.message).split("\n")[0].slice(0, 70)})`,
      );
    }
  }
}
await browser.close();
writeFileSync(
  `${out}/_${slug}-${width}${process.env.SUFFIX ?? ""}.json`,
  JSON.stringify({ files, skipped: [...skipped], blocked: [...new Set(blocked)] }, null, 1),
);
console.log(
  slug,
  width,
  "files",
  files.length,
  "skipped",
  skipped.size,
  "blocked writes",
  new Set(blocked).size,
);
