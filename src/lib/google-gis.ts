// Fix 5 (R-158 item 2, item 3): Continue with Google through Google Identity Services in the browser, so Google's
// account chooser names kabsi.co (the page's own origin) and not the supabase.co address of the redirect flow. Google
// gives the browser an ID token; Supabase checks it with signInWithIdToken and a nonce: Google gets the SHA-256 hash
// (hex) of a fresh random nonce and Supabase gets the nonce itself, as Supabase's guide says. The script loads only
// when the sign-in panel shows the Google button. If it does not load, or no web client ID is set, the panel keeps the
// redirect flow (signInWithOAuth) as before.
import { supabase } from "@/lib/supabase";

/** The Google web client ID (public). Empty until Rashid makes the client: the redirect flow is used meanwhile. */
export const GOOGLE_WEB_CLIENT_ID = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? "").trim();
export const GIS_SRC = "https://accounts.google.com/gsi/client";
const LOAD_MS = 4000;

type Credential = { credential?: string };
type GisId = {
  initialize: (o: {
    client_id: string;
    callback: (r: Credential) => void;
    nonce: string;
    ux_mode?: "popup";
    context?: "signin";
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
    auto_select?: boolean;
  }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  cancel?: () => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GisId } };
  }
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** A fresh nonce: `raw` goes to Supabase, `hashed` (SHA-256, hex) to Google. Never reused. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hashed = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
  return { raw, hashed };
}

let loading: Promise<GisId | null> | null = null;
/** Loads Google's script once. Answers null when there is no client ID, the script fails, or it takes over 4 seconds. */
export function loadGis(
  doc: Document = document,
  clientId = GOOGLE_WEB_CLIENT_ID,
  ms = LOAD_MS,
): Promise<GisId | null> {
  if (!clientId) return Promise.resolve(null);
  if (typeof window !== "undefined" && window.google?.accounts?.id)
    return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GisId | null>((resolve) => {
    const done = (v: GisId | null) => {
      window.clearTimeout(timer);
      if (!v) loading = null;
      resolve(v);
    };
    const timer = window.setTimeout(() => done(null), ms);
    const s = doc.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => done(window.google?.accounts?.id ?? null);
    s.onerror = () => {
      s.remove();
      done(null);
    };
    doc.head.appendChild(s);
  });
  return loading;
}

/**
 * Draws Google's own "Continue with Google" button in `el`. A tap opens Google's chooser on kabsi.co; its ID token
 * signs in with Supabase and the nonce made for this button. `onSigned` and `onError` tell the panel what happened.
 * Each draw makes a new nonce, so a token is good for one sign-in only.
 */
export async function drawGoogleButton(
  gis: GisId,
  el: HTMLElement,
  opts: { width: number; onSigned: () => void; onError: (e: unknown) => void; clientId?: string },
  deps: {
    signIn: (a: { token: string; nonce: string }) => Promise<{ error: unknown }>;
  } = {
    signIn: ({ token, nonce }) =>
      supabase.auth.signInWithIdToken({ provider: "google", token, nonce }),
  },
): Promise<void> {
  // Each draw has its own nonce; after any answer from Google the button is drawn again with a fresh one, so a nonce
  // is never used twice (Fix 5 review finding 3).
  const nonce = await makeNonce();
  const redraw = () => void drawGoogleButton(gis, el, opts, deps).catch(opts.onError);
  gis.initialize({
    client_id: opts.clientId ?? GOOGLE_WEB_CLIENT_ID,
    nonce: nonce.hashed,
    ux_mode: "popup",
    context: "signin",
    itp_support: true,
    use_fedcm_for_button: true,
    auto_select: false,
    callback: (r) => {
      if (!r.credential) {
        opts.onError(new Error("no credential"));
        return redraw();
      }
      deps
        .signIn({ token: r.credential, nonce: nonce.raw })
        .then(({ error }) => {
          if (!error) return opts.onSigned();
          opts.onError(error);
          redraw();
        })
        .catch((e) => {
          opts.onError(e);
          redraw();
        });
    },
  });
  gis.renderButton(el, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    logo_alignment: "center",
    width: Math.max(200, Math.min(400, Math.round(opts.width))),
  });
}
