// The design tokens an email reads (K-108, K-102, master plan 30.18 section 3). Copies of the brand constants in
// src/styles.css, because an email cannot read a stylesheet; tests/email-template.test.ts keeps every one equal. No
// imports, so every email module and test can use it.
export const TOKENS = {
  yellow: "#FFD60A",
  black: "#000000",
  ink: "#111111",
  white: "#FFFFFF",
  sand: "#F6F4EF",
  stone: "#5E5B55",
  hairline: "#E4E0D7",
  night: "#0C0C0B",
  carbon: "#161614",
  graphite: "#211F1C",
  paper: "#F5F3EE",
  mute: "#B8B3A8",
  green: "#1F8A5B",
  greenInk: "#17704A",
  greenSoft: "#E6F4EC",
  greenOnDark: "#5FD39B",
  redInk: "#B3261E",
  redSoft: "#FCE8E6",
  redOnDark: "#FF8A80",
  amber: "#B45309",
  amberSoft: "#FEF3C7",
  amberOnDark: "#F5B94A",
} as const;

/** The css name of each token in src/styles.css (--kb-<name>), for the equality test. */
export const TOKEN_CSS: Record<keyof typeof TOKENS, string> = {
  yellow: "yellow", black: "black", ink: "ink", white: "white", sand: "sand", stone: "stone", hairline: "hairline",
  night: "night", carbon: "carbon", graphite: "graphite", paper: "paper", mute: "mute",
  green: "green", greenInk: "green-ink", greenSoft: "green-soft", greenOnDark: "green-on-dark",
  redInk: "red-ink", redSoft: "red-soft", redOnDark: "red-on-dark", amber: "amber", amberSoft: "amber-soft", amberOnDark: "amber-on-dark",
};

/** Dividers on the dark card: paper at 12 percent (the line role of the dark theme). */
export const DARK_LINE = "rgba(245,243,238,0.14)";

// Headings in Bricolage Grotesque (hosted on kabsi.co, read by Apple Mail and the clients that load web fonts), the body
// in the system face; every other client falls back to its own sans serif.
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const HEAD_FONT = `'Bricolage Grotesque',${FONT}`;
export const HEAD_FONT_URL = "https://kabsi.co/fonts/bricolage-grotesque-latin-wght.woff2";

// K-102: one column 600 px wide at most, body text 16 px, buttons and links at least 44 px tall.
export const SIZES = { width: 600, body: 16, tap: 44 } as const;
