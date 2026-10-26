import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { MAIN_CTA, SCAN_LINE } from "@/lib/site";
import { Button, Field } from "./ui";

/**
 * The one scan box (COPY.md, shared pieces): it opens the free check on /scan. An industry page names the search the
 * check runs and its industry, so the free check uses that page's search term.
 */
export function ScanBox({
  className,
  id,
  defaultValue = "",
  keyword,
  industry,
  note,
}: {
  /** Kept for older callers: the line under the box is always the free check line. */
  under?: "trial" | "scan";
  className?: string | undefined;
  id?: string | undefined;
  defaultValue?: string | undefined;
  /** An industry page names the search the scan will run ("barber shop"). */
  keyword?: string | undefined;
  /** The industry page's slug, so the free check can use that industry's search term. */
  industry?: string | undefined;
  /** Replaces the line under the box. */
  note?: string | undefined;
}) {
  return (
    <div data-main-cta className={cn("w-full", className)}>
      <ScanForm id={id} defaultValue={defaultValue} keyword={keyword} industry={industry} />
      <p className="mt-3 text-small text-text-2">{note ?? SCAN_LINE}</p>
    </div>
  );
}

function ScanForm({
  id,
  defaultValue,
  keyword,
  industry,
}: {
  id?: string | undefined;
  defaultValue: string;
  keyword?: string | undefined;
  industry?: string | undefined;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) {
      setError("Type your business name and city.");
      return;
    }
    void navigate({
      to: "/scan",
      search: { q: q.trim(), ...(keyword ? { keyword } : {}), ...(industry ? { industry } : {}) },
    });
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Field
        id={id}
        className="min-w-0 flex-1"
        label="Find your business on Google"
        placeholder="Business name and city"
        autoComplete="organization"
        enterKeyHint="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (error) setError(null);
        }}
        error={error}
        hint={keyword ? `Kabsi searches for '${keyword}', like a customer.` : undefined}
        leading={<Search className="size-5 shrink-0 text-text-3" aria-hidden />}
      />
      <Button type="submit" className="sm:mt-[1.875rem]">
        {MAIN_CTA}
      </Button>
    </form>
  );
}
