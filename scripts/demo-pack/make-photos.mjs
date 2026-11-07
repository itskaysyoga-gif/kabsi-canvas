// Demo pack (R-125): draws the 14 placeholder photos of the two demo businesses in the design tokens (no real photo, logo or face).
// Usage: node scripts/demo-pack/make-photos.mjs <empty folder>. Nothing it writes belongs in the repository (R-121).
import { chromium } from "playwright";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
const T = {
  sand: "#f6f4ef",
  paper: "#f5f3ee",
  hair: "#e4e0d7",
  ink: "#111111",
  stone: "#5e5b55",
  yellow: "#ffd60a",
  green: "#1f8a5b",
  greenSoft: "#e6f4ec",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  graphite: "#211f1c",
  smoke: "#2c2a26",
  water: "#d7e3e6",
  block: "#e3dfd4",
};
// each: [file, bg, subject drawing, label]
const cafe = [
  [
    "c1",
    T.sand,
    `<rect x="120" y="470" width="960" height="40" fill="${T.ink}"/><rect x="120" y="510" width="960" height="260" fill="${T.stone}"/><circle cx="330" cy="400" r="70" fill="${T.yellow}"/><rect x="560" y="330" width="180" height="140" rx="16" fill="${T.graphite}"/><rect x="800" y="360" width="200" height="110" rx="16" fill="${T.green}"/>`,
    "Counter",
  ],
  [
    "c2",
    T.block,
    `<rect x="90" y="120" width="1020" height="420" rx="24" fill="${T.water}"/><rect x="90" y="540" width="1020" height="30" fill="${T.ink}"/><rect x="300" y="590" width="140" height="150" rx="12" fill="${T.amber}"/><rect x="760" y="590" width="140" height="150" rx="12" fill="${T.amber}"/><circle cx="600" cy="330" r="90" fill="${T.paper}"/>`,
    "Window seats",
  ],
  [
    "c3",
    T.paper,
    `<ellipse cx="600" cy="620" rx="330" ry="60" fill="${T.hair}"/><path d="M430 300h340l-40 300h-260z" fill="${T.ink}"/><rect x="480" y="260" width="240" height="50" rx="12" fill="${T.yellow}"/><path d="M770 380q110 20 0 150" fill="none" stroke="${T.ink}" stroke-width="30"/>`,
    "Flat white",
  ],
  [
    "c4",
    T.sand,
    `<rect x="180" y="460" width="840" height="290" rx="20" fill="${T.hair}"/><ellipse cx="400" cy="520" rx="130" ry="70" fill="${T.amber}"/><ellipse cx="640" cy="520" rx="130" ry="70" fill="${T.yellow}"/><ellipse cx="880" cy="520" rx="110" ry="60" fill="${T.stone}"/><circle cx="520" cy="300" r="60" fill="${T.green}"/>`,
    "Pastries",
  ],
  [
    "c5",
    T.water,
    `<rect x="140" y="300" width="920" height="470" fill="${T.paper}"/><rect x="140" y="230" width="920" height="90" fill="${T.green}"/><rect x="220" y="400" width="260" height="370" rx="10" fill="${T.ink}"/><rect x="560" y="400" width="420" height="220" rx="10" fill="${T.water}"/>`,
    "Storefront",
  ],
  [
    "c6",
    T.paper,
    `<rect x="430" y="150" width="340" height="560" rx="30" fill="${T.stone}"/><rect x="460" y="300" width="280" height="200" rx="14" fill="${T.yellow}"/><circle cx="600" cy="400" r="50" fill="${T.ink}"/><rect x="520" y="190" width="160" height="40" rx="10" fill="${T.paper}"/>`,
    "Beans to take home",
  ],
];
const salon = [
  [
    "s1",
    T.sand,
    `<rect x="140" y="480" width="920" height="60" fill="${T.ink}"/><rect x="140" y="540" width="920" height="220" fill="${T.stone}"/><rect x="250" y="260" width="300" height="190" rx="16" fill="${T.water}"/><circle cx="800" cy="360" r="80" fill="${T.green}"/>`,
    "Front desk",
  ],
  [
    "s2",
    T.block,
    `<rect x="180" y="300" width="220" height="300" rx="30" fill="${T.ink}"/><rect x="490" y="300" width="220" height="300" rx="30" fill="${T.ink}"/><rect x="800" y="300" width="220" height="300" rx="30" fill="${T.ink}"/><rect x="150" y="120" width="900" height="130" rx="14" fill="${T.water}"/>`,
    "Styling chairs",
  ],
  [
    "s3",
    T.paper,
    `<path d="M300 250q300 -160 600 0v300q-300 120 -600 0z" fill="${T.amber}"/><path d="M360 300q240 -100 480 0v220q-240 90 -480 0z" fill="${T.yellow}"/>`,
    "Balayage",
  ],
  [
    "s4",
    T.sand,
    `<rect x="500" y="200" width="200" height="500" rx="40" fill="${T.graphite}"/><rect x="420" y="170" width="360" height="90" rx="30" fill="${T.stone}"/><circle cx="260" cy="480" r="90" fill="${T.yellow}"/>`,
    "Blow-dry",
  ],
  [
    "s5",
    T.water,
    `<rect x="160" y="260" width="880" height="500" fill="${T.paper}"/><rect x="160" y="190" width="880" height="90" fill="${T.ink}"/><rect x="230" y="360" width="300" height="400" rx="10" fill="${T.green}"/><rect x="620" y="360" width="340" height="230" rx="10" fill="${T.water}"/>`,
    "Studio front",
  ],
  [
    "s6",
    T.paper,
    `<rect x="140" y="260" width="920" height="30" fill="${T.ink}"/><rect x="140" y="520" width="920" height="30" fill="${T.ink}"/><rect x="220" y="140" width="80" height="120" rx="12" fill="${T.green}"/><rect x="340" y="150" width="80" height="110" rx="12" fill="${T.yellow}"/><rect x="460" y="130" width="80" height="130" rx="12" fill="${T.stone}"/><rect x="260" y="390" width="90" height="130" rx="12" fill="${T.amber}"/><rect x="400" y="400" width="90" height="120" rx="12" fill="${T.green}"/>`,
    "Care products",
  ],
  [
    "s7",
    T.sand,
    `<path d="M300 650L700 250" stroke="${T.ink}" stroke-width="26" stroke-linecap="round"/><path d="M360 700L800 280" stroke="${T.stone}" stroke-width="26" stroke-linecap="round"/><circle cx="270" cy="680" r="50" fill="${T.yellow}"/><circle cx="340" cy="740" r="50" fill="${T.green}"/>`,
    "Tools",
  ],
  [
    "s8",
    T.block,
    `<circle cx="420" cy="360" r="110" fill="${T.stone}"/><circle cx="780" cy="360" r="110" fill="${T.graphite}"/><rect x="290" y="480" width="260" height="260" rx="40" fill="${T.stone}"/><rect x="650" y="480" width="260" height="260" rx="40" fill="${T.graphite}"/>`,
    "The team (shapes only)",
  ],
];
const out = process.argv[2];
mkdirSync(out + "/cafe", { recursive: true });
mkdirSync(out + "/salon", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const sizes = {};
for (const [dir, list] of [
  ["cafe", cafe],
  ["salon", salon],
])
  for (const [f, bg, svg, label] of list) {
    await p.setContent(
      `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" font-family="Manrope, Arial, sans-serif"><rect width="1200" height="900" fill="${bg}"/>${svg}<text x="60" y="860" font-size="34" fill="${T.stone}">Placeholder image: ${label}</text></svg></body>`,
    );
    const file = `${out}/${dir}/${f}.jpg`;
    await p.screenshot({ path: file, type: "jpeg", quality: 72 });
    sizes[`${dir}/${f}`] = statSync(file).size;
  }
await b.close();
writeFileSync(out + "/sizes.json", JSON.stringify(sizes, null, 1));
console.log(sizes);
