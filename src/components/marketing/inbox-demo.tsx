import { useState } from "react";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Homepage centrepiece (KABSI-BRAND "Public site"): a real, clickable review → draft → Post · Edit · Skip.
// Everything in it is invented and labelled "Example"; tapping Post only changes this card.
const EXAMPLES = [
  {
    key: "en",
    tab: "English",
    dir: "ltr" as const,
    reviewer: "Nadine",
    rating: 5,
    review: "Lovely spot, great coffee, and they remembered my order from last week.",
    draft:
      "Thank you so much, Nadine! We're really glad you enjoyed the coffee, and the team will be happy to hear it. See you again soon.",
  },
  {
    key: "ar",
    tab: "العربية",
    dir: "rtl" as const,
    reviewer: "Karim",
    rating: 4,
    review: "الأكل كتير طيب بس الخدمة كانت بطيئة شوي وقت الغدا.",
    draft:
      "شكراً كتير على تقييمك يا كريم! مبسوطين إنو عجبك الأكل، وآسفين إنو الخدمة تأخرت عليك وقت الغدا. نتمنى نشوفك قريباً.",
  },
  {
    key: "fr",
    tab: "Français",
    dir: "ltr" as const,
    reviewer: "Sophie",
    rating: 2,
    review: "Commande arrivée froide et avec beaucoup de retard. Dommage.",
    draft:
      "Merci pour votre retour, Sophie. Nous sommes désolés que votre commande soit arrivée froide et en retard. N'hésitez pas à nous appeler pour en parler directement.",
  },
];

type Stage = "draft" | "edit" | "posted" | "skipped";

export function InboxDemo() {
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<Stage>("draft");
  const [texts, setTexts] = useState(EXAMPLES.map((e) => e.draft));
  const ex = EXAMPLES[i]!;

  const pick = (n: number) => {
    setI(n);
    setStage("draft");
  };

  return (
    <div className="w-full max-w-md rounded-large bg-kb-white p-5 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.55)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">New Google review</p>
        <span className="rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone">
          Example
        </span>
      </div>

      <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Example reviews">
        {EXAMPLES.map((e, n) => (
          <button
            key={e.key}
            type="button"
            role="tab"
            aria-selected={n === i}
            onClick={() => pick(n)}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-bold transition-colors",
              n === i
                ? "bg-kb-black text-kb-white"
                : "bg-kb-sand text-kb-stone hover:text-kb-black",
            )}
          >
            {e.tab}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-card bg-kb-sand p-4" dir={ex.dir}>
        <div className="flex items-center gap-2" dir="ltr">
          <span className="text-sm font-bold">{ex.reviewer}</span>
          <span className="flex" role="img" aria-label={`${ex.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn("size-3.5", s <= ex.rating ? "fill-kb-black" : "text-kb-stone/40")}
              />
            ))}
          </span>
        </div>
        <p className="mt-1.5 text-[15px] leading-6">{ex.review}</p>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-kb-stone">
        {stage === "posted" ? "Your reply" : "Reply drafted for you"}
      </p>
      {stage === "edit" ? (
        <textarea
          dir={ex.dir}
          aria-label="Edit the reply"
          value={texts[i]}
          onChange={(e) => setTexts(texts.map((t, n) => (n === i ? e.target.value : t)))}
          rows={4}
          className="mt-2 w-full resize-none rounded-card border-2 border-kb-black p-3 text-[15px] leading-6 outline-none"
        />
      ) : (
        <p
          dir={ex.dir}
          className={cn(
            "mt-2 rounded-card border border-kb-hairline p-3 text-[15px] leading-6",
            stage === "skipped" && "text-kb-stone line-through",
          )}
        >
          {texts[i]}
        </p>
      )}

      <div className="mt-4 min-h-[52px]" aria-live="polite">
        {stage === "posted" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-bold text-kb-green">
              <span className="grid size-6 place-items-center rounded-full bg-kb-green text-kb-white">
                <Check className="size-4" />
              </span>
              Posted on Google
            </p>
            <button
              type="button"
              onClick={() => pick((i + 1) % EXAMPLES.length)}
              className="text-sm font-medium underline"
            >
              Next example
            </button>
          </div>
        ) : stage === "skipped" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-kb-stone">Skipped. Nothing was posted.</p>
            <button
              type="button"
              onClick={() => setStage("draft")}
              className="text-sm font-medium underline"
            >
              Undo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button className="flex-1" onClick={() => setStage("posted")}>
              Post
            </Button>
            <Button
              variant="outline"
              className="px-5"
              onClick={() => setStage(stage === "edit" ? "draft" : "edit")}
            >
              {stage === "edit" ? "Done" : "Edit"}
            </Button>
            <Button variant="ghost" className="px-4" onClick={() => setStage("skipped")}>
              Skip
            </Button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-kb-stone">
        This is an example. On Kabsi, nothing is posted until you tap Post.
      </p>
    </div>
  );
}
