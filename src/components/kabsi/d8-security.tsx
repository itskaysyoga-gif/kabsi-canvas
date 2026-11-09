// Security on Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the hero with what Kabsi can and can never do as a
// Manager, "In plain words", Manager access and how to remove it (with Rashid's removal recording), the rest of
// kabsi-canvas's own security text (written to the system as built, facts 9.9), "What Kabsi never does" on the dark band
// and the closing free check.
import type { ReactNode } from "react";
import { Check, KeyRound, Lock, ShieldCheck, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, KABSI_GROUP_ID, KABSI_GROUP_NAME } from "@/lib/site";
import { RemoveKabsi } from "./d5-access";
import { PageHero, popCls, stagger } from "./page-hero";
import { Closing } from "./closing";
import { SECURITY_HERO } from "./hero-lines";
import { Marked } from "@/components/kabsi/highlight";
import { Img, PHOTOS } from "./photos";

const MAIL = (
  <a className="font-semibold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
    {CONTACT_EMAIL}
  </a>
);

const CAN = [
  "Prepare replies, posts and fixes",
  "Send to Google what you approved",
  "Check it is live on Google",
] as const;
const CANNOT = [
  "See your Google password",
  "Take ownership of your profile",
  "Publish anything without your yes",
  "Stay after you remove it",
] as const;

function CanCannotVisual() {
  return (
    <figure className="relative grid gap-3 sm:grid-cols-2">
      <div className="rounded-panel border border-line bg-surface-1 p-5 shadow-rest">
        <p className="flex items-center gap-2 text-title font-bold">
          <KeyRound className="size-5" aria-hidden />
          As your Manager, Kabsi can
        </p>
        <ul className="mt-4 space-y-2.5">
          {CAN.map((c, i) => (
            <li key={c} className={cn("flex gap-2.5 text-small", popCls)} style={stagger(i)}>
              <Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="theme-dark rounded-panel bg-band p-5 text-text-1 shadow-float">
        <p className="flex items-center gap-2 text-title font-bold">
          <Lock className="size-5" aria-hidden />
          Kabsi never can
        </p>
        <ul className="mt-4 space-y-2.5">
          {CANNOT.map((c, i) => (
            <li key={c} className={cn("flex gap-2.5 text-small", popCls)} style={stagger(i + 3)}>
              <X className="mt-0.5 size-4 shrink-0 text-text-2" strokeWidth={2.5} aria-hidden />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 text-small text-text-2 sm:col-span-2">
        <ShieldCheck className="size-4 shrink-0 text-ok" aria-hidden />
        You stay the owner. Kabsi is independent and not affiliated with Google.
      </p>
    </figure>
  );
}

const SUMMARY = [
  "Kabsi never sees your Google password.",
  "You can remove Kabsi as a Manager any time.",
  "Nothing goes live without your yes.",
  "Kabsi's database is in Frankfurt. Data is encrypted in transit.",
  "Data from your Google profile is deleted 7 days after you leave.",
  "Report a problem: hello@kabsi.co.",
] as const;

const NEVER = [
  "Posts without your yes.",
  "Asks for your Google password.",
  "Writes fake reviews or rewards reviews.",
  "Asks only happy customers.",
  "Messages your customers.",
] as const;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-h3">{title}</h3>
      <div className="mt-3 space-y-3 text-body text-text-2 [&_li]:marker:text-text-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-5 [&_a]:font-semibold [&_a]:text-text-1 [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-text-1">
        {children}
      </div>
    </div>
  );
}

export function D8Security() {
  return (
    <>
      {/* Site 2 (master plan 30.34 item 4): a hero photo above what Kabsi can and never can do. */}
      <PageHero
        mark="stays yours."
        hero={SECURITY_HERO}
        visual={
          <div className="grid gap-4">
            <Img
              photo={PHOTOS.phoneShop}
              sizes="(min-width: 1024px) 34rem, calc(100vw - 40px)"
              priority
              className="aspect-[2/1] w-full rounded-panel bg-surface-2 object-cover shadow-float"
            />
            <CanCannotVisual />
          </div>
        }
      />

      <section aria-labelledby="sum-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="sum-h" className="text-h2">
              <Marked text="In plain words" mark="plain words" />
            </h2>
            {/* Site 2: a phone approval beside the summary. */}
            <Img
              photo={PHOTOS.phoneReading}
              sizes="(min-width: 1024px) 24rem, calc(100vw - 40px)"
              className="mt-8 aspect-[3/2] w-full rounded-panel bg-surface-2 object-cover lg:aspect-[4/5] lg:max-w-[24rem]"
              style={{ objectPosition: "50% 30%" }}
            />
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {SUMMARY.map((s) => (
              <li key={s} className="flex gap-3 py-4 text-body">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="remove"
        aria-labelledby="manager-h"
        className="scroll-mt-20 border-t border-line"
      >
        <div className="container-kb section-y">
          <h2 id="manager-h" className="text-h2">
            <Marked text="Manager access, and how to remove it" mark="how to remove it" />
          </h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Block title="What a Manager can do">
              <p>
                Google gives a Manager access to help run a profile. You can read about the{" "}
                <a href="https://support.google.com/business/answer/3403100">
                  roles on Google's own page
                </a>
                . You stay the owner.
              </p>
              <ul>
                <li>Kabsi reads new reviews and prepares reply drafts.</li>
                <li>Every reply, post, photo and change shows you the exact text first.</li>
                <li>Kabsi posts only what you approved. It cannot post on its own.</li>
                <li>Every Google action happens inside Kabsi, for the business that asked.</li>
                <li>
                  No one else, partners included, gets a way to read or write your Google data.
                </li>
              </ul>
            </Block>
            <Block title="Disconnect Kabsi">
              <ul>
                <li>
                  In Kabsi, open <strong>Settings</strong> and choose{" "}
                  <strong>Disconnect Kabsi from Google</strong>.
                </li>
                <li>Only the signed-in owner can do it.</li>
                <li>Kabsi stops at once and cancels what was waiting for your approval.</li>
                <li>Then it removes its own Manager access, and an email confirms it.</li>
                <li>
                  If Google blocks that, our team does it within 7 business days, with the date.
                </li>
              </ul>
              <p>You can also do it on Google, without asking us.</p>
              <p>
                Open <strong>Business Profile settings</strong>, choose{" "}
                <strong>People and access</strong>, then remove <strong>{KABSI_GROUP_NAME}</strong>{" "}
                (group ID {KABSI_GROUP_ID}). Kabsi loses access at once.
              </p>
            </Block>
          </div>
          <RemoveKabsi className="mt-10 rounded-panel border border-line bg-surface-1 p-5 sm:p-8" />
        </div>
      </section>

      <section aria-labelledby="data-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="data-h" className="text-h2">
            <Marked text="Your data, your sign-in, and who to ask" mark="who to ask" />
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12">
            <Block title="Notice of any change">
              <p>
                When Kabsi accepts your Manager invitation, or its access changes, we email you
                within 48 hours.
              </p>
              <p>
                The email says what changed and how to remove Kabsi. Google's own notices are
                separate.
              </p>
            </Block>
            <Block title="How you sign in, and what we never ask">
              <ul>
                <li>You sign in with Google or a one time code sent to your email.</li>
                <li>No passwords.</li>
                <li>Kabsi never asks for your Google password or a Google verification code.</li>
                <li>Kabsi stores no Google token of yours.</li>
                <li>Kabsi's own Google access stays on our servers, never in anyone's browser.</li>
                <li>Links in Kabsi emails work once and expire after 72 hours.</li>
                <li>A link belongs to its recipient. Opening one does nothing by itself.</li>
                <li>Profile changes and reviews that need care also need that person signed in.</li>
              </ul>
            </Block>
            <Block title="How your data is handled">
              <ul>
                <li>Kabsi's database is in Frankfurt. Data is encrypted in transit.</li>
                <li>Each business's data is separated at the database level.</li>
                <li>Only its members, and Kabsi staff when helping you, can read it.</li>
                <li>
                  Review text and reviewer names from Google go 30 days after Google last returned
                  them.
                </li>
                <li>Kabsi's own Google account uses Google's Advanced Protection Program.</li>
                <li>We never sell Google data, advertise with it or train AI models on it.</li>
                <li>
                  Staff read it only with your consent, for security, or when the law requires.
                </li>
              </ul>
              <p>
                The <Link to="/privacy">privacy policy</Link> lists every provider and what we keep.
              </p>
            </Block>
            <Block title="Payments, and who to ask">
              <p>Payments are processed by Creem, our merchant of record.</p>
              <p>If you think something is wrong, write to {MAIL}. A person replies.</p>
            </Block>
          </div>
        </div>
      </section>

      <section aria-labelledby="never-h" className="theme-dark bg-band">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="never-h" className="text-h2">
              What Kabsi never does
            </h2>
            {/* Site 2: an owner at work beside the five promises. */}
            <Img
              photo={PHOTOS.cafeCounter}
              sizes="(min-width: 1024px) 28rem, calc(100vw - 40px)"
              className="mt-8 aspect-[3/2] w-full rounded-panel bg-surface-2 object-cover"
            />
          </div>
          {/* Style 1 (30.33 item 2): five cards never leave one alone in the last row; it is centred. */}
          <ul className="flex flex-wrap justify-center gap-3">
            {NEVER.map((n) => (
              <li
                key={n}
                className="w-full rounded-card border border-line p-4 text-body font-semibold sm:w-[calc((100%-0.75rem)/2)]"
              >
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Closing />
    </>
  );
}
