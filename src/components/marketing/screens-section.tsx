// SITE-4: Kabsi's own screens as a section of their own (How it works, Pricing and the industry pages). Home shows the
// row inside its proof section, so this file stays out of Home's script.
import { Head } from "./kit";
import { ScreenRow, type ScreenId } from "./life";

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
