// The packs Kabsi ships. Adding a pack is a new file in this folder and one line here; no other file changes.
import type { Pack } from "./schema.ts";
import { garageV1 } from "./garage.v1.ts";
import { gymV1 } from "./gym.v1.ts";
import { salonV1 } from "./salon.v1.ts";

export const PACKS: readonly Pack[] = [salonV1, gymV1, garageV1];

/** The pack a location row names (location_packs.pack and pack_version), or null when Kabsi has no such pack. */
export function getPack(id: string, version: number): Pack | null {
  return PACKS.find((p) => p.id === id && p.version === version) ?? null;
}

export { garageV1, gymV1, salonV1 };
export type { Pack } from "./schema.ts";
