// The review graphic (P0.8-07, K-134): a square (1080 x 1080) and a story (1080 x 1920) PNG for a 4 or 5 star review.
// Satori lays the page out as SVG and resvg (WebAssembly) turns it into a PNG, all inside the Edge Function: the
// fonts and the wasm are embedded (assets.ts), so there is no network or file read. The image is built from the
// request and returned; nothing is stored. Colours and fonts are the design tokens (K-108): Readex Pro and Lalezar,
// the tokens' yellow, ink, white, stone and sand.
import satori from "npm:satori@0.15.2";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { TOKENS } from "../email/tokens.ts";
import { LALEZAR_400, READEX_400, READEX_700, RESVG_WASM_GZ } from "./assets.ts";

export type GraphicSize = "square" | "story";
export const SIZES: Record<GraphicSize, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

export type GraphicInput = { rating: 4 | 5; text: string; name: string; business: string };

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
// Satori reads fonts as an ArrayBuffer.
const buffer = (b64: string): ArrayBuffer => bytes(b64).buffer as ArrayBuffer;

let ready: Promise<{ fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] }> | null = null;
export function setup() {
  ready ??= (async () => {
    const stream = new Blob([bytes(RESVG_WASM_GZ)]).stream().pipeThrough(new DecompressionStream("gzip"));
    await initWasm(new Uint8Array(await new Response(stream).arrayBuffer()));
    return {
      fonts: [
        { name: "Readex Pro", data: buffer(READEX_400), weight: 400 as const, style: "normal" as const },
        { name: "Readex Pro", data: buffer(READEX_700), weight: 700 as const, style: "normal" as const },
        { name: "Lalezar", data: buffer(LALEZAR_400), weight: 400 as const, style: "normal" as const },
      ],
    };
  })();
  return ready;
}

// Satori takes plain objects: { type, props: { style, children } }.
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

const star = (fill: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.9l-6.4 3.6L7 14.3 1.7 9.3l7.2-.9z"/></svg>`,
  )}`;

/** The quote's size by length: a short review is set large, a 200 character one still fits eight lines. */
export function quoteSize(text: string, size: GraphicSize): number {
  const n = [...text].length;
  const base = n <= 70 ? 84 : n <= 120 ? 68 : n <= 170 ? 58 : 52;
  return size === "story" ? Math.round(base * 1.25) : base;
}

export function graphicTree(input: GraphicInput, size: GraphicSize): Node {
  const { width, height } = SIZES[size];
  const story = size === "story";
  const pad = story ? 64 : 54;
  const stars = [1, 2, 3, 4, 5].map((i) =>
    el("img", { width: story ? 76 : 64, height: story ? 76 : 64 }, undefined, {
      src: star(i <= input.rating ? TOKENS.black : TOKENS.hairline),
      width: story ? 76 : 64,
      height: story ? 76 : 64,
    }),
  );
  const card = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      background: TOKENS.white,
      borderRadius: 56,
      padding: story ? 84 : 72,
    },
    [
      el("div", { display: "flex", gap: 10 }, stars),
      el("div", { display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", paddingTop: 24, paddingBottom: 24 }, [
        el(
          "div",
          { display: "flex", fontFamily: "Lalezar", fontSize: story ? 240 : 170, lineHeight: 1, color: TOKENS.yellow, height: story ? 130 : 84 },
          "\u201C",
        ),
        el(
          "div",
          { display: "flex", fontFamily: "Readex Pro", fontWeight: 700, fontSize: quoteSize(input.text, size), lineHeight: 1.22, color: TOKENS.ink },
          input.text,
        ),
      ]),
      el("div", { display: "flex", flexDirection: "column" }, [
        el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 700, fontSize: story ? 48 : 42, color: TOKENS.ink }, input.name),
        el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 400, fontSize: story ? 38 : 34, color: TOKENS.stone, marginTop: 6 }, input.business),
      ]),
    ],
  );
  return el("div", { display: "flex", width, height, background: TOKENS.yellow, padding: pad }, card);
}

/** A PNG of the graphic. Throws only on a rendering fault; the caller has already checked the review is eligible. */
export async function renderGraphic(input: GraphicInput, size: GraphicSize): Promise<Uint8Array> {
  const { fonts } = await setup();
  const { width, height } = SIZES[size];
  const svg = await satori(graphicTree(input, size) as never, { width, height, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}
