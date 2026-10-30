import { MapPin, Store } from "lucide-react";
import { TRIAL_LINE } from "@/lib/site";
import { ToolTabs } from "./d2-parts";
import { NearbyPlaces } from "./nearby-places";
import { ScanBox } from "./scan-box";

/**
 * The one free check (master plan 30.16 section 4): the public profile facts and the nearby check together, shown
 * before Kabsi asks for anything. /scan and /google-profile-check both open it.
 */
export function FreeCheckStart() {
  return (
    <>
      <section className="container-kb pt-28 lg:pt-36">
        <ToolTabs current="/scan" />
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div>
            <h1 className="max-w-2xl text-display">Check your business on Google, free.</h1>
            <p className="mt-5 max-w-xl text-lead text-text-2">
              See your public Google profile and where you come up nearby, together. Kabsi asks for
              nothing before you see the result.
            </p>
            <ScanBox className="mt-8 max-w-xl" />
            <ul className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
              <li className="rounded-card border border-line bg-surface-1 p-5">
                <Store className="size-5 text-text-2" aria-hidden />
                <p className="mt-3 text-title">Your Google profile</p>
                <p className="mt-1 text-small text-text-2">
                  Rating, reviews without a reply, hours, photos, phone and booking link, and what
                  is missing.
                </p>
              </li>
              <li className="rounded-card border border-line bg-surface-1 p-5">
                <MapPin className="size-5 text-text-2" aria-hidden />
                <p className="mt-3 text-title">Where you come up nearby</p>
                <p className="mt-1 text-small text-text-2">
                  Three places near you, who came first there, and one count from 49 places.
                </p>
              </li>
            </ul>
            <p className="mt-8 max-w-xl text-small text-text-2">
              The full check from 49 places around you opens at launch. {TRIAL_LINE}
            </p>
          </div>
          <NearbyPlaces title="h2" />
        </div>
      </section>
      <div className="pb-20 lg:pb-28" />
    </>
  );
}
