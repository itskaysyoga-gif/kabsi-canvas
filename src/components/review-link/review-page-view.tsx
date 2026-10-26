import { MessageCircle } from "lucide-react";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { Button } from "@/components/ui/button";
import { MANAGER_LINE, managerHref, type ReviewPageData } from "@/lib/review-page";

// What a customer sees after a tap or a scan on a link set to "Show the page" (P0.8-05, K-132). Phone first. The
// Google button is the first control in the document and the only yellow one; the manager line comes after it and
// shows only when the business saved a WhatsApp number. No question, no rating screen, no routing: the same page
// for every visitor.
export function ReviewPageView({ data }: { data: ReviewPageData }) {
  return (
    <Shell>
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
        Thank you for visiting
      </p>
      <h1 className="mt-2 font-display text-4xl leading-tight">{data.name}</h1>
      <p className="mt-3 leading-7 text-kb-stone">
        Tell other people how your visit went. It takes a minute.
      </p>
      <Button asChild className="mt-7 h-14 w-full text-lg">
        <a href={data.review_url} rel="noopener">
          Write a Google review
        </a>
      </Button>
      <ul className="mt-6 space-y-2 text-left text-sm leading-6 text-kb-stone">
        <li>Say what you honestly thought. Everyone sees this same page.</li>
        <li>Your review goes to Google. Kabsi does not read it or change it.</li>
      </ul>
      {data.whatsapp ? (
        <a
          href={managerHref(data.whatsapp, data.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold"
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
      <h1 className="font-display text-3xl leading-tight">This review link is no longer active.</h1>
      <p className="mt-3 leading-7 text-kb-stone">
        Ask the business for a new one. Thank you for trying.
      </p>
    </Shell>
  );
}

export function ReviewPageLoading() {
  return (
    <Shell>
      <p className="text-kb-stone" role="status">
        Loading…
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-kb-sand px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center rounded-large bg-kb-white p-6 text-center shadow-kb sm:p-10">
          {children}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-kb-stone">
          <KabsiMark className="size-5" />
          Kabsi
        </p>
      </div>
    </main>
  );
}
