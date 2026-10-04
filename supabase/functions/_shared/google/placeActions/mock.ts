// Mock of the place action links: none set.
import type { ListPlaceActionLinksResponse } from "../types.ts";

export const listPlaceActionLinks = (_location: string): Promise<ListPlaceActionLinksResponse> => Promise.resolve({});
