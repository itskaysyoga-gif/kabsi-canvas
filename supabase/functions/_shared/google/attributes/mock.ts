// Mock of the attributes read: none set. Google returns only the name then, with no `attributes` key (seen live on
// both Kabsi-owned profiles, 8 Oct 2026).
import type { Attributes } from "../types.ts";

export const getAttributes = (location: string): Promise<Attributes> => Promise.resolve({ name: `${location}/attributes` });
