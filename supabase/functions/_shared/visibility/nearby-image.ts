// The nearby places image Kabsi sends on WhatsApp (master plan 30.15 section 2, 30.17 section 4: portrait 1080 by 1500; V4
// item 5). Three cards (the place, where the owner came up, who came first) and the one count, with the search term, the date
// and "Sample Google Maps results, not customer counts." The same engines and palette PNG as the map image; colours are the
// map tokens, and every position is printed as words as well as colour. Under 250 KB.
import satori from "npm:satori@0.15.2";
import { Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { setup } from "../review-graphic/render.ts";
import { TOKENS } from "../email/tokens.ts";
import { encodePalettePng } from "./png.ts";
import { CREDIT_KABSI, MAX_BYTES, pinStyle, title } from "./map-image.ts";
import type { Nearby } from "./nearby.ts";

export const WIDTH = 1080;
export const HEIGHT = 1500;
export const CREDIT_NAMES = "Place names: © OpenStreetMap contributors.";

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });
const text = (s: string, size: number, weight: 400 | 700, color: string, extra: Record<string, unknown> = {}) =>
  el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: weight, fontSize: size, color, ...extra }, s);
const clip = (s: string, max: number) => ([...s].length <= max ? s : [...s].slice(0, max - 1).join("").trimEnd() + "…");

export function nearbyTree(n: Nearby, o: { business: string; date: string; named: boolean }): Node {
  const cards = n.cards.map((c, i) => {
    const p = pinStyle(c.rank);
    return el("div", {
      display: "flex", flexDirection: "column", background: TOKENS.white, border: `2px solid ${TOKENS.hairline}`, borderRadius: 24,
      padding: "32px 36px", marginTop: i ? 28 : 0,
    }, [
      text(clip(c.place, 44), 38, 700, TOKENS.ink),
      el("div", { display: "flex", alignItems: "center", marginTop: 20 }, [
        el("div", {
          display: "flex", alignItems: "center", justifyContent: "center", height: 64, padding: "0 26px", borderRadius: 32,
          background: p.fill, border: `2px solid ${p.ring === TOKENS.white ? p.fill : p.ring}`, color: p.text,
          fontFamily: "Readex Pro", fontWeight: 700, fontSize: 30,
        }, `You: ${c.position}`),
      ]),
      text(c.firstIsYou ? "First: you" : c.first ? clip(`First: ${c.first}`, 46) : "First: not known", 30, 400, TOKENS.stone, { marginTop: 18 }),
    ]);
  });
  return el("div", { display: "flex", flexDirection: "column", width: WIDTH, height: HEIGHT, background: TOKENS.sand, padding: "56px 56px 40px 56px" }, [
    text(title(n.keyword, o.business, 36), 46, 700, TOKENS.ink),
    text(o.date, 28, 400, TOKENS.stone, { marginTop: 8, marginBottom: 40 }),
    ...cards,
    text(n.count_line, 36, 700, TOKENS.ink, { marginTop: 44 }),
    text(n.note, 26, 400, TOKENS.stone, { marginTop: 14 }),
    el("div", { display: "flex", flexGrow: 1 }),
    text(CREDIT_KABSI, 24, 700, TOKENS.stone),
    text(o.named ? CREDIT_NAMES : " ", 24, 400, TOKENS.stone, { marginTop: 8 }),
  ]);
}

/** The PNG. Throws if it would be over 250 KB, so an oversized image never goes out. */
export async function renderNearby(n: Nearby, o: { business: string; date: string }): Promise<Uint8Array<ArrayBuffer>> {
  const { fonts } = await setup();
  const named = n.cards.some((c) => !!c.name);
  const svg = await satori(nearbyTree(n, { ...o, named }) as never, { width: WIDTH, height: HEIGHT, fonts });
  const img = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render();
  const png = await encodePalettePng(img.pixels, img.width, img.height);
  if (png.length > MAX_BYTES) throw new Error(`nearby_image_too_big_${png.length}`);
  return png;
}
