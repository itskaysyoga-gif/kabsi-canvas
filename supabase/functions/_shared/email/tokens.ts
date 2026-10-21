// The design tokens an email reads (K-108, K-102). Equal to the colours in src/styles.css; tests/email-template.test.ts
// keeps them equal. No imports, so every email module and test can use it.
export const TOKENS = {
  yellow: "#FFD60A",
  black: "#000000",
  ink: "#111111",
  white: "#FFFFFF",
  sand: "#F6F4EF",
  stone: "#5E5B55",
  hairline: "#E4E0D7",
} as const;

export const FONT = "'Readex Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// K-102: one column 600 px wide at most, body text 16 px, buttons and links at least 44 px tall.
export const SIZES = { width: 600, body: 16, tap: 44 } as const;
