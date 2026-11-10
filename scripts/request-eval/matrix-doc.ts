// RB-T: writes docs/kabsi-3/scenario-matrix.md from the matrix rows (supabase/functions/_shared/whatsapp/rb-t.matrix.ts).
//   deno run --allow-write=docs/kabsi-3 scripts/request-eval/matrix-doc.ts
// tests/rb-t-matrix.test.ts fails when the file and the rows differ. No network, no model.
import { matrixMarkdown } from "../../supabase/functions/_shared/whatsapp/rb-t.matrix.ts";

if (import.meta.main) {
  await Deno.writeTextFile(
    new URL("../../docs/kabsi-3/scenario-matrix.md", import.meta.url),
    matrixMarkdown() + "\n",
  );
  console.log("Wrote docs/kabsi-3/scenario-matrix.md");
}
