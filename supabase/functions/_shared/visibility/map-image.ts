// The map image Kabsi sends (master plan 28.2, DESIGN.md "Visuals Kabsi sends", docs/COPY.md section 21): 1080 x 1080,
// a static street map (Geoapify) under 49 rank pins, the Kabsi mark as the business pin, the legend in words, and
// "Kabsi rank check, not provided by Google" with the map attribution printed on the image. Satori lays it out (and
// turns the text into shapes, so no font file is read at render time) and resvg (WebAssembly) renders it, the same
// engines as the review graphic; png.ts packs it into a palette PNG under 250 KB. Pin colours are the map tokens:
// map-rank-top 1 to 3, map-rank-mid 4 to 10, map-rank-low 11 to 20 with a 2 px kb-amber ring, map-rank-none "20+".
// Never red against green; the rank is printed in every pin.
import satori from "npm:satori@0.15.2";
import { Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { setup } from "../review-graphic/render.ts";
import { TOKENS } from "../email/tokens.ts";
import { type GridPoint, type LatLng, project } from "./grid.ts";
import { encodePalettePng } from "./png.ts";

export const SIZE = 1080;
export const HEADER = 150;
export const MAP_HEIGHT = 720;
export const GRID_SPAN = 624; // pixels between the west and east pins (2 x radius)
export const MAX_BYTES = 250 * 1024;

// DESIGN.md tokens used by the map (src/styles.css gets them in Web 2; tests/visibility-map.test.ts keeps them equal).
export const MAP_TOKENS = {
  top: "#146c46",
  mid: "#6cc497",
  low: "#fef3c7",
  none: "#0b0b0b",
  amber: "#b45309",
  carbon: "#0b0b0b",
} as const;

// public/kabsi-mark.svg, byte for byte (DESIGN.md: never redrawn). tests/visibility-map.test.ts compares them.
export const KABSI_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><title>Kabsi</title><circle cx="60" cy="60" r="58" fill="#000000"/><circle cx="60" cy="60" r="42.0036" fill="#FFD60A"/><circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000000"/></svg>';

export const CREDIT_KABSI = "Kabsi rank check, not provided by Google.";
export const CREDIT_MAP = "Map: Geoapify, © OpenStreetMap contributors.";
export const LEGEND = ["1 to 3", "4 to 10", "11 to 20", "Not in top 20"] as const;

export type Band = "top" | "mid" | "low" | "none";
export function band(rank: number | null): Band {
  if (rank == null || rank > 20) return "none";
  if (rank <= 3) return "top";
  if (rank <= 10) return "mid";
  return "low";
}

export function pinStyle(rank: number | null) {
  const b = band(rank);
  return {
    band: b,
    label: b === "none" ? "20+" : String(rank),
    fill: MAP_TOKENS[b],
    text: b === "top" || b === "none" ? TOKENS.white : TOKENS.ink,
    // The amber ring is the low band's mark, always; the others get a white edge so they read on any street.
    ring: b === "low" ? MAP_TOKENS.amber : TOKENS.white,
  };
}

export type MapImageInput = {
  keyword: string;
  business: string;
  date: string; // "25 Oct 2026"
  center: LatLng;
  zoom: number;
  points: (GridPoint & { rank: number | null })[];
  /** The street map, PNG or JPEG bytes, MAP_HEIGHT tall and SIZE wide; null draws a plain ground (no key yet). */
  base: { bytes: Uint8Array; type: "image/png" | "image/jpeg" } | null;
};

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const MARK_URI = `data:image/svg+xml;base64,${btoa(KABSI_MARK_SVG)}`;

/** "'bakery' around Harbor Cafe", shortened with an ellipsis so it stays on one line. */
export function title(keyword: string, business: string, max = 40): string {
  const t = `'${keyword}' around ${business}`;
  return [...t].length <= max ? t : [...t].slice(0, max - 1).join("").trimEnd() + "…";
}

const PIN = 28;

function pin(x: number, y: number, rank: number | null): Node {
  const p = pinStyle(rank);
  return el("div", {
    position: "absolute", left: x - PIN, top: y - PIN, width: PIN * 2, height: PIN * 2, borderRadius: PIN,
    background: p.fill, border: `2px solid ${p.ring}`, display: "flex", alignItems: "center", justifyContent: "center",
    color: p.text, fontFamily: "Readex Pro", fontWeight: 700, fontSize: p.label.length > 2 ? 20 : 26,
  }, p.label);
}

function businessPin(x: number, y: number, rank: number | null): Node[] {
  const p = pinStyle(rank);
  return [
    el("img", { position: "absolute", left: x - 32, top: y - 32, width: 64, height: 64 }, undefined, { src: MARK_URI, width: 64, height: 64 }),
    el("div", {
      position: "absolute", left: x - 30, top: y + 38, width: 60, height: 30, borderRadius: 15, background: p.fill,
      border: `2px solid ${p.ring}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.text,
      fontFamily: "Readex Pro", fontWeight: 700, fontSize: 18,
    }, p.label),
  ];
}

export function mapTree(input: MapImageInput): Node {
  const cx = SIZE / 2, cy = HEADER + MAP_HEIGHT / 2;
  const half = Math.max(...input.points.map((p) => p.row)) / 2;
  const pins: Node[] = [];
  let home: Node[] = [];
  for (const p of input.points) {
    const o = project(input.center, input.zoom, p);
    const x = Math.round(cx + o.x), y = Math.round(cy + o.y);
    if (p.row === half && p.col === half) home = businessPin(x, y, p.rank);
    else pins.push(pin(x, y, p.rank));
  }
  const base = input.base
    ? el("img", { position: "absolute", left: 0, top: HEADER, width: SIZE, height: MAP_HEIGHT }, undefined, {
      src: `data:${input.base.type};base64,${b64(input.base.bytes)}`, width: SIZE, height: MAP_HEIGHT,
    })
    : el("div", { position: "absolute", left: 0, top: HEADER, width: SIZE, height: MAP_HEIGHT, background: TOKENS.sand });
  const legend = LEGEND.map((label, i) => {
    const p = pinStyle([1, 4, 11, null][i]);
    return el("div", { display: "flex", alignItems: "center", marginRight: 36 }, [
      el("div", { width: 28, height: 28, borderRadius: 14, background: p.fill, border: `2px solid ${p.ring === TOKENS.white ? p.fill : p.ring}`, marginRight: 10 }),
      el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 400, fontSize: 24, color: TOKENS.ink }, label),
    ]);
  });
  return el("div", { display: "flex", position: "relative", width: SIZE, height: SIZE, background: TOKENS.white }, [
    el("div", { position: "absolute", left: 48, top: 34, display: "flex", flexDirection: "column" }, [
      el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 700, fontSize: 40, color: TOKENS.ink }, title(input.keyword, input.business)),
      el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 400, fontSize: 26, color: TOKENS.stone, marginTop: 6 }, input.date),
    ]),
    base,
    ...pins,
    ...home,
    el("div", {
      position: "absolute", left: 0, top: HEADER + MAP_HEIGHT, width: SIZE, height: SIZE - HEADER - MAP_HEIGHT,
      borderTop: `1px solid ${TOKENS.hairline}`, display: "flex", flexDirection: "column", padding: "28px 48px 0 48px",
    }, [
      el("div", { display: "flex", alignItems: "center" }, legend),
      el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 700, fontSize: 22, color: TOKENS.stone, marginTop: 30 }, CREDIT_KABSI),
      el("div", { display: "flex", fontFamily: "Readex Pro", fontWeight: 400, fontSize: 22, color: TOKENS.stone, marginTop: 8 }, input.base ? CREDIT_MAP : " "),
    ]),
  ]);
}

/** The PNG Kabsi sends. Palette-packed; throws if it would still be over 250 KB, so an oversized image never goes out. */
export async function renderMap(input: MapImageInput): Promise<Uint8Array<ArrayBuffer>> {
  const { fonts } = await setup();
  const svg = await satori(mapTree(input) as never, { width: SIZE, height: SIZE, fonts });
  const img = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } }).render();
  const png = await encodePalettePng(img.pixels, img.width, img.height);
  if (png.length > MAX_BYTES) throw new Error(`map_image_too_big_${png.length}`);
  return png;
}

/** The date line, in the business's time zone. */
export function mapDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(d);
}
