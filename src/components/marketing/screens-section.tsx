// SITE-4: Kabsi's own screens as a section of their own (How it works, Pricing and the industry pages). Home shows the
// row inside its proof section, so this file stays out of Home's script.
import { Head } from "./kit";
import { ScreenRow, type ScreenId, type Shot } from "./life";

const ALL_SCREENS: readonly ScreenId[] = ["report", "cards", "email"];

/** Kabsi's own screens as a section of their own. */
export function ProductScreens({
  id = "screens",
  title = "See the work in Kabsi itself.",
  line = "Real screens from Kabsi's account and email, shown with an example business.",
  only = ALL_SCREENS,
  className,
}: {
  id?: string;
  title?: string;
  line?: string;
  only?: readonly ScreenId[];
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={className}>
      <div className="container-kb py-14 sm:py-20 lg:py-24" data-rise>
        <Head id={id} title={title} line={line} />
        <ScreenRow ids={only} className="mt-10" />
      </div>
    </section>
  );
}

/** SITE-5: Kabsi's screens that Home does not show (Pricing, How it works), kept out of Home's script. */
export const MORE_SCREENS = {
  // SITE-6: How it works' hero: what waits for the owner's yes (was the weekly report, under its Settings title).
  home: {
    src: "/screens/app-home-560.webp",
    // SITE-7: redrawn on APP-1's Home: three things waiting, a review reply first, then a post.
    alt: "Kabsi's Home screen for an example business: three things waiting for a yes, a review reply first, then a post",
    title: "Everything waits for your yes",
    line: "Replies, posts and fixes wait on one screen until you approve them.",
  },
  reviews: {
    src: "/screens/app-reviews-560.webp",
    alt: "Kabsi's Reviews screen with a reply ready to approve, for an example business",
    title: "A reply for every review",
    line: "Each new review arrives with a reply in your voice, waiting for your yes.",
  },
  shield: {
    src: "/screens/app-shield-560.webp",
    alt: "Kabsi's Google profile screen showing a phone number changed on Google, for an example business",
    title: "Your details watched",
    line: "When something changes on Google, you see what changed and fix it with one tap.",
  },
} satisfies Record<string, Shot>;
