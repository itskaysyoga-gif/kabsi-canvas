import { useEffect } from "react";
import { CircleSlash, MessageCircle } from "lucide-react";
import { KabsiMark, buttonClass } from "@/components/kabsi/ui";
import { MANAGER_LINE, managerHref, type ReviewPageData } from "@/lib/review-page";
import { cn } from "@/lib/utils";

// What a customer sees after a tap or a scan on a link set to "Show the page" (P0.8-05, K-132). Design 2's review page:
// light, phone first, the business's name and a large initial, no photo. The Google button is the first control in the
// document and the only yellow one; the manager line comes after it and shows only when the business saved a WhatsApp
// number. No question, no score screen, no routing: the same page for every visitor.
export function ReviewPageView({ data }: { data: ReviewPageData }) {
  return (
    <Shell>
      <span
        aria-hidden
        className="grid size-24 place-items-center rounded-full bg-surface-3 font-display text-display font-bold text-text-1"
      >
        {initial(data.name)}
      </span>
      <h1 className="mt-6 font-display text-h2 font-bold text-text-1">{data.name}</h1>
      <p className="mt-4 text-lead text-text-1">
        Tell other people how your visit went. It takes a minute.
      </p>
      <a
        href={data.review_url}
        rel="noopener"
        data-main-cta
        className={cn(buttonClass("primary", "lg", true), "mt-7 h-14 w-full text-title")}
      >
        Write a review on Google
      </a>
      <ul className="mt-6 space-y-2 text-small text-text-2">
        <li>Say what you honestly thought. Everyone sees this same page.</li>
        <li>Your review goes to Google. Kabsi does not read it or change it.</li>
      </ul>
      {data.whatsapp ? (
        <a
          href={managerHref(data.whatsapp, data.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-small font-bold text-text-1"
        >
          <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="underline underline-offset-4">{MANAGER_LINE}</span>
        </a>
      ) : null}
    </Shell>
  );
}

export function ReviewPageUnavailable() {
  return (
    <Shell>
      <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-text-2">
        <CircleSlash className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-h2 font-bold text-text-1">
        This review link is no longer active.
      </h1>
      <p className="mt-3 text-lead text-text-2">
        Ask the business for a new one. Thank you for trying.
      </p>
    </Shell>
  );
}

export function ReviewPageLoading() {
  return (
    <Shell>
      <p className="text-text-2" role="status">
        Loading
      </p>
    </Shell>
  );
}

function initial(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "";
}

function Shell({ children }: { children: React.ReactNode }) {
  // Light like every customer page (Design 2 round 2): on the page and on <body>, so the privacy panel opens light.
  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => document.body.classList.remove("theme-light");
  }, []);
  return (
    <main className="theme-light flex min-h-dvh flex-col bg-surface-0 text-text-1">
      <div className="container-kb flex-1 pt-10 pb-10 sm:pt-16">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
      <p className="container-kb flex items-center justify-center gap-2 pb-[max(2rem,env(safe-area-inset-bottom))] text-small text-text-3">
        <KabsiMark className="size-5" />
        Kabsi
      </p>
    </main>
  );
}
