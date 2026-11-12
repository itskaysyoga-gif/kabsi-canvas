// Fix 5 (R-158 item 2, items 2 and 3): Continue with Google through Google Identity Services with a nonce (Google gets
// its SHA-256 hash, Supabase the nonce itself), the redirect flow as the fallback when Google's script does not load, and
// the WhatsApp sign-in that starts in the background with a passed check only.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** A document whose script element fires load or error as told. */
function fakeDoc(outcome: "load" | "error" | "never", onLoad?: () => void) {
  const added: { src: string }[] = [];
  const doc = {
    createElement: () => {
      const s = {
        src: "",
        async: false,
        defer: false,
        onload: null as null | (() => void),
        onerror: null as null | (() => void),
        remove: () => {},
      };
      return s;
    },
    head: {
      appendChild: (s: {
        src: string;
        onload: null | (() => void);
        onerror: null | (() => void);
      }) => {
        added.push(s);
        if (outcome === "load")
          setTimeout(() => {
            onLoad?.();
            s.onload?.();
          }, 0);
        if (outcome === "error") setTimeout(() => s.onerror?.(), 0);
      },
    },
  };
  return { doc: doc as unknown as Document, added };
}

describe("Google Identity Services", () => {
  it("makes a fresh nonce each time; Google gets its SHA-256 hex, Supabase the nonce itself", async () => {
    const { makeNonce, drawGoogleButton } = await import("../src/lib/google-gis");
    const a = await makeNonce();
    const b = await makeNonce();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hashed).toBe(createHash("sha256").update(a.raw).digest("hex"));
    expect(a.hashed).toMatch(/^[0-9a-f]{64}$/);

    let init: {
      nonce: string;
      client_id: string;
      callback: (r: { credential?: string }) => void;
    } | null = null;
    const gis = {
      initialize: (o: typeof init) => void (init = o),
      renderButton: vi.fn(),
    };
    const signIn = vi.fn(async () => ({ error: null }));
    const onSigned = vi.fn();
    await drawGoogleButton(
      gis as never,
      {} as HTMLElement,
      { width: 360, onSigned, onError: vi.fn(), clientId: "web-client.apps.googleusercontent.com" },
      { signIn },
    );
    expect(init!.client_id).toBe("web-client.apps.googleusercontent.com");
    init!.callback({ credential: "id-token" });
    await vi.waitFor(() => expect(onSigned).toHaveBeenCalled());
    const sent = (signIn.mock.calls[0] as unknown as [{ token: string; nonce: string }])[0];
    expect(sent.token).toBe("id-token");
    expect(createHash("sha256").update(sent.nonce).digest("hex")).toBe(init!.nonce);
    expect(gis.renderButton).toHaveBeenCalledOnce();
  });

  it("a refused token is an error, never a sign-in, and the next try gets a fresh nonce", async () => {
    const { drawGoogleButton } = await import("../src/lib/google-gis");
    const inits: { nonce: string; callback: (r: { credential?: string }) => void }[] = [];
    const onSigned = vi.fn();
    const onError = vi.fn();
    const sent: string[] = [];
    await drawGoogleButton(
      {
        initialize: (o: (typeof inits)[number]) => void inits.push(o),
        renderButton: () => {},
      } as never,
      {} as HTMLElement,
      { width: 300, onSigned, onError, clientId: "x" },
      {
        signIn: async ({ nonce }) => {
          sent.push(nonce);
          return { error: new Error("nonce mismatch") };
        },
      },
    );
    inits[0]!.callback({ credential: "t" });
    await vi.waitFor(() => expect(inits).toHaveLength(2));
    inits[1]!.callback({ credential: "t2" });
    await vi.waitFor(() => expect(inits).toHaveLength(3));
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onSigned).not.toHaveBeenCalled();
    // Never the same nonce twice, to Google or to Supabase.
    expect(new Set(inits.map((i) => i.nonce)).size).toBe(3);
    expect(new Set(sent).size).toBe(2);
    inits[2]!.callback({});
    await vi.waitFor(() => expect(inits).toHaveLength(4));
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it("falls back to the redirect flow: no client ID, a script error, or no answer in 4 seconds", async () => {
    vi.stubGlobal("window", globalThis);
    vi.resetModules();
    const { loadGis } = await import("../src/lib/google-gis");
    expect(await loadGis(fakeDoc("load").doc, "")).toBeNull();
    expect(await loadGis(fakeDoc("error").doc, "id")).toBeNull();
    vi.useFakeTimers();
    const slow = loadGis(fakeDoc("never").doc, "id", 4000);
    vi.advanceTimersByTime(4001);
    expect(await slow).toBeNull();
    vi.useRealTimers();
    const id = { initialize: () => {}, renderButton: () => {} };
    const f = fakeDoc("load", () => vi.stubGlobal("google", { accounts: { id } }));
    expect(await loadGis(f.doc, "id")).toBe(id);
    expect(f.added[0]!.src).toBe("https://accounts.google.com/gsi/client");
  });

  it("loads Google's script only from the sign-in panel, keeps the redirect button as the fallback and hides it while the provider is off", () => {
    const users = ["src"]
      .flatMap(function walk(d: string): string[] {
        return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? walk(`${d}/${e.name}`)
            : /\.tsx?$/.test(e.name)
              ? [`${d}/${e.name}`]
              : [],
        );
      })
      .filter((f) => /loadGis\(|gsi\/client/.test(read(f)));
    expect(users.sort()).toEqual([
      "src/components/auth/sign-in-panel.tsx",
      "src/lib/google-gis.ts",
    ]);
    const panel = read("src/components/auth/sign-in-panel.tsx");
    expect(panel).toMatch(/googleOk \? \(\s*<GisGoogle/);
    expect(panel).toMatch(/fallback=\{\s*<GoogleChoice/);
    expect(read("vercel.json")).toContain("https://accounts.google.com/gsi/client");
  });
});

describe("WhatsApp sign-in starts when the panel opens", () => {
  it("never renews a shown code in the background; a stale one is replaced only at the tap", async () => {
    const step = read("src/components/auth/whatsapp-signin.tsx");
    expect(step).not.toMatch(/setTimeout\(again/);
    expect(step).toMatch(/const FRESH_MS = 5 \* 60_000/);
    const panel = read("src/components/auth/sign-in-panel.tsx");
    // R-161: the replacement happens at intent (`want`), which the tap also calls.
    expect(panel.match(/wa\.want\(\);/g)).toHaveLength(3); // two taps and the intent helper
    const { minutesLeft } = await import("../src/components/auth/whatsapp-signin");
    expect(minutesLeft(10 * 60_000, 0)).toBe("It works for 10 minutes.");
    expect(minutesLeft(6 * 60_000 + 1, 0)).toBe("It works for 7 more minutes.");
    expect(minutesLeft(30_000, 0)).toBe("It works for 1 more minute.");
  });
  it("the panel keeps one bot check mounted and asks for a code only with a passed check", () => {
    const panel = read("src/components/auth/sign-in-panel.tsx");
    expect(panel).toMatch(/const wa = useWaPrestart\(waOn\)/);
    expect(panel).toMatch(/\{wa\.widget\(step === "whatsapp"\)\}/);
    const step = read("src/components/auth/whatsapp-signin.tsx");
    expect(step).toMatch(/if \(!o\.wanted \|\| !o\.token \|\| o\.busy\) return false;/);
    expect(step).toContain("Open WhatsApp on this computer");
    expect(step).toMatch(/data-wa-qr/);
  });
  it("shows at most three numbered steps and no consent paragraph over two lines", async () => {
    const step = read("src/components/auth/whatsapp-signin.tsx");
    expect(step.match(/<Step n=\{\d\}>/g)).toHaveLength(3);
    const { WA_CONSENT_SHORT, WA_CONSENT_LINES, WHATSAPP_SIGNIN_CONSENT } =
      await import("../supabase/functions/_shared/wa-signin");
    // About 45 characters a line at 390 px in the small size: two lines.
    for (const l of [WA_CONSENT_SHORT, ...WA_CONSENT_LINES])
      expect(l.length).toBeLessThanOrEqual(92);
    // The list says what the stored consent says.
    for (const fact of [
      "sign-in",
      "300 characters",
      "draft reply",
      "first name",
      "STOP",
      "Meta's WhatsApp Business Platform",
    ])
      expect([WA_CONSENT_SHORT, ...WA_CONSENT_LINES].join(" ")).toContain(fact);
    expect(WHATSAPP_SIGNIN_CONSENT).toContain("Meta's WhatsApp Business Platform");
    expect(WHATSAPP_SIGNIN_CONSENT.toLowerCase()).not.toContain("kapso");
  });
});
