// Fix 3 part B (Sentry KABSI-WEB-C): after a deploy, a tab opened on the old version asks for a route file that no
// longer exists ("Failed to fetch dynamically imported module"). The page then reloads once, to the same address, and
// gets the new version. A sessionStorage mark keeps it to once: if the file fails again within GUARD_MS, the error
// page shows instead, with Try again (a full reload), so the page can never loop.

const KEY = "kabsi_chunk_reload";
export const GUARD_MS = 5 * 60_000;

const CHUNK_ERROR = [
  /Failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite's CSS preload
  /Loading (CSS )?chunk [\w-]+ failed/i,
  /is not a valid JavaScript MIME type/i, // the old file's address now answers with the HTML page
];

/** Whether an error is a route file that could not be loaded. */
export function isChunkLoadError(error: unknown): boolean {
  const e = error as { message?: unknown; name?: unknown } | null | undefined;
  const text = `${String(e?.name ?? "")} ${String(e?.message ?? error ?? "")}`;
  return CHUNK_ERROR.some((r) => r.test(text));
}

export type ReloadEnv = {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  href: string;
  reload: () => void;
  now: () => number;
};

function browserEnv(): ReloadEnv | null {
  if (typeof window === "undefined") return null;
  let storage: ReloadEnv["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  return {
    storage,
    href: window.location.href,
    reload: () => window.location.reload(),
    now: () => Date.now(),
  };
}

/**
 * Reloads the page once for this address. True when a reload was started (show nothing and wait); false when this
 * address already reloaded within GUARD_MS, or the mark cannot be kept (show the error page, never loop).
 */
export function reloadOnceForChunk(env: ReloadEnv | null = browserEnv()): boolean {
  if (!env?.storage) return false;
  try {
    const last = JSON.parse(env.storage.getItem(KEY) ?? "null") as {
      href?: string;
      at?: number;
    } | null;
    if (last?.href === env.href && typeof last.at === "number" && env.now() - last.at < GUARD_MS)
      return false;
    env.storage.setItem(KEY, JSON.stringify({ href: env.href, at: env.now() }));
    // Read back: a storage that drops writes (some private modes) must not let the page reload again and again.
    if (!env.storage.getItem(KEY)) return false;
  } catch {
    return false;
  }
  env.reload();
  return true;
}
