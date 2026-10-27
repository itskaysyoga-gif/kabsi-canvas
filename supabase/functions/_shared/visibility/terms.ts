// The free check prefilled per industry (master plan 30.17 section 2, V4 item 6): each industry page opens the free check with
// the search its customers type most, read from DataForSEO keyword data (Google Ads search volume), never guessed. A staff op
// (POST /visibility/terms) checks a few candidate words per wave 1 industry in each launch market, one call per market (about
// 0.075 US dollars each), and keeps the one with the most searches in industry_search_terms. Pure apart from the fetcher.
import { COUNTRY_CODES } from "./locate.ts";

/** Wave 1 industries (30.17 section 2) and the words their customers might use. The data picks; these are only the candidates. */
export const CANDIDATES: Record<string, string[]> = {
  "hair-salons": ["hair salon", "hairdresser", "ladies salon", "hair salon near me"],
  "barbershops": ["barber", "barber shop", "barbershop", "mens haircut"],
  "nail-and-beauty-salons": ["nail salon", "beauty salon", "nails", "manicure"],
  "spas-and-massage": ["spa", "massage", "massage spa", "day spa"],
  "dental-clinics": ["dentist", "dental clinic", "dentist near me"],
  "medical-and-aesthetic-clinics": ["aesthetic clinic", "medical clinic", "skin clinic", "clinic"],
  "physiotherapy": ["physiotherapy", "physiotherapist", "physio"],
  "restaurants": ["restaurant", "restaurants", "restaurant near me"],
  "cafes": ["cafe", "coffee shop", "coffee"],
  "bakeries": ["bakery", "cake shop", "bakery near me"],
  "auto-repair": ["car repair", "garage", "auto repair", "mechanic"],
  "gyms-and-fitness-studios": ["gym", "fitness studio", "gym near me", "fitness"],
};
/**
 * Terms lane R approved per market (UX 1, 27 Oct 2026, from Content 1's claim sheets). For these industries and markets the
 * approved word is kept whatever the volumes say; its volume is still read and stored. Each one is also a candidate above.
 */
export const APPROVED: Record<string, Partial<Record<(typeof MARKETS)[number], string>>> = {
  "cafes": { AE: "cafe", GB: "cafe" },
  "medical-and-aesthetic-clinics": { AE: "aesthetic clinic", GB: "skin clinic" },
  "auto-repair": { AE: "car repair", GB: "car repair" },
  "nail-and-beauty-salons": { AE: "nail salon", GB: "nail salon" },
};
/** Launch markets (30.16 section 2): the UAE and the UK. */
export const MARKETS = ["AE", "GB"] as const;
export const TERMS_COST_MICROS = 75_000; // one Google Ads search volume task, up to 1000 keywords

/** "hair salon near me" is a phrase, not a search Kabsi can check from a place: the words without "near me". */
export const plain = (t: string) => t.replace(/\s+near me$/i, "").trim();

export type Volume = { keyword: string; volume: number | null };

export type Picked = { term: string; volume: number | null; candidates: Volume[]; source: "dataforseo_google_ads" | "lane_r_approved" };

/**
 * For each industry, the candidate with the most searches; ties keep the shorter phrase. A missing volume never wins. With a
 * market, a term lane R approved for that market (APPROVED) is picked instead, with its own volume (null when DataForSEO has none).
 */
export function pickTerms(volumes: Volume[], market?: string): Record<string, Picked> {
  const by = new Map(volumes.map((v) => [v.keyword.toLowerCase(), v.volume]));
  const out: Record<string, Picked> = {};
  for (const [industry, words] of Object.entries(CANDIDATES)) {
    const scored = words.map((w) => ({ keyword: w, volume: by.get(w.toLowerCase()) ?? null }));
    // Phrases with "near me" count towards their plain search: the free check searches from the business's own place.
    const merged = new Map<string, number>();
    for (const s of scored) if (s.volume != null) merged.set(plain(s.keyword), (merged.get(plain(s.keyword)) ?? 0) + s.volume);
    const approved = market ? APPROVED[industry]?.[market as (typeof MARKETS)[number]] : undefined;
    if (approved) {
      out[industry] = { term: approved, volume: merged.get(approved) ?? null, candidates: scored, source: "lane_r_approved" };
      continue;
    }
    const best = [...merged.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
    if (best && best[1] > 0) out[industry] = { term: best[0], volume: best[1], candidates: scored, source: "dataforseo_google_ads" };
  }
  return out;
}

/** One call per market: every candidate of every industry at once. */
export async function searchVolumes(login: string, password: string, market: string, fetcher: typeof fetch = fetch): Promise<{ volumes: Volume[]; cost: number }> {
  const code = COUNTRY_CODES[market];
  if (!code) throw new Error(`no_location_code_${market}`);
  const keywords = [...new Set(Object.values(CANDIDATES).flat())];
  const res = await fetcher("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
    method: "POST",
    headers: { authorization: "Basic " + btoa(`${login}:${password}`), "content-type": "application/json" },
    body: JSON.stringify([{ keywords, location_code: code, language_code: "en" }]),
  });
  if (!res.ok) throw new Error(`dataforseo_http_${res.status}`);
  const j = (await res.json()) as { status_code: number; cost?: number; tasks?: { status_code: number; cost?: number; result?: { keyword: string; search_volume: number | null }[] | null }[] };
  const t = j.tasks?.[0];
  if (j.status_code !== 20000 || !t || t.status_code !== 20000) throw new Error(`dataforseo_${t?.status_code ?? j.status_code}`);
  return {
    volumes: (t.result ?? []).map((r) => ({ keyword: r.keyword, volume: typeof r.search_volume === "number" ? r.search_volume : null })),
    cost: Math.round((t.cost ?? j.cost ?? TERMS_COST_MICROS / 1e6) * 1e6),
  };
}
