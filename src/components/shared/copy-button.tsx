import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <Button
      type="button"
      size="compact"
      variant="outline"
      onClick={() => {
        void copyText(text).then((ok) => {
          setState(ok ? "done" : "failed");
          setTimeout(() => setState("idle"), 1800);
        });
      }}
    >
      {state === "done" ? <Check /> : state === "failed" ? <TriangleAlert /> : <Copy />}
      {state === "done" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
    </Button>
  );
}
