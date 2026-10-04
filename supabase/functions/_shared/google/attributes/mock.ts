// Mock of the attributes read: none set.
import type { Attributes } from "../types.ts";

export const getAttributes = (location: string): Promise<Attributes> => Promise.resolve({ name: `${location}/attributes`, attributes: [] });
