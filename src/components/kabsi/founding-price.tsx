// Price 1: the founding price beside the list price, shown only while founding places remain. The count is the real one
// from billing-creem/founding; while it loads or if it fails, nothing is shown (never a number that is not real).
import { useEffect, useState } from "react";
import { foundingLine } from "@/lib/site";
import { loadFoundingPriceLeft } from "@/lib/public-api";

export function useFoundingLeft(): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    void loadFoundingPriceLeft().then(setLeft);
  }, []);
  return left;
}

export function FoundingPriceLine({
  plan,
  yearly = false,
  left,
  className,
}: {
  plan: "essentials" | "pro";
  yearly?: boolean;
  left: number | null;
  className?: string;
}) {
  if (left === null || left <= 0) return null;
  return (
    <p className={className ?? "mt-2 text-small font-semibold text-text-1"}>
      {foundingLine(plan, yearly)}
    </p>
  );
}
