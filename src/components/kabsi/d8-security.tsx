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
      <div className="mt-3 space-y-3 text-body text-text-2 [&_a]:font-semibold [&_a]:text-text-1 [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-text-1">
        {children}
      </div>
    </div>
  );
}

export function D8Security() {
  return (
    <>
      <PageHero hero={SECURITY_HERO} visual={<CanCannotVisual />} />

      <section aria-labelledby="sum-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <h2 id="sum-h" className="text-h2">
            In plain words
          </h2>
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
            Manager access, and how to remove it
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
              <p>
                Kabsi reads new reviews, prepares reply drafts, and posts only what you approved.
                Every reply, post, photo and change shows you the exact text first and waits for
                your tap. Kabsi cannot post on its own. Every Google action happens inside Kabsi,
                for the business that asked. Kabsi gives no one else, partners included, a way to
                read or write your Google data.
              </p>
            </Block>
            <Block title="Disconnect Kabsi">
              <p>
                In Kabsi, open <strong>Settings</strong> and choose{" "}
                <strong>Disconnect Kabsi from Google</strong>. Only the signed-in owner can do it.
                Kabsi stops at once, cancels what was waiting for your approval and then removes its
                own Manager access. You get an email that confirms it. If Google does not let Kabsi
                remove itself, our team does it within 7 business days and tells you the date.
              </p>
              <p>
                You can also do it on Google, without asking us. Open{" "}
                <strong>Business Profile settings</strong>, choose{" "}
                <strong>People and access</strong>, then remove <strong>{KABSI_GROUP_NAME}</strong>{" "}
                (group ID {KABSI_GROUP_ID}). Kabsi loses access to that profile at once.
              </p>
            </Block>
          </div>
          <RemoveKabsi className="mt-10 rounded-panel border border-line bg-surface-1 p-5 sm:p-8" />
        </div>
      </section>

      <section aria-labelledby="data-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="data-h" className="text-h2">
            Your data, your sign-in, and who to ask
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12">
            <Block title="Notice of any change">
              <p>
                When Kabsi accepts your Manager invitation, or anything about its access changes, we
                email you within 48 hours to say what changed and how to remove Kabsi. This is
                separate from the notices Google sends.
              </p>
            </Block>
            <Block title="How you sign in, and what we never ask">
              <p>
                You sign in with a one-time code sent to your email. There are no passwords. Kabsi
                never asks for your Google password or a Google verification code, and does not
                store a Google token of yours. Kabsi's own access to Google is held on our servers
                and never reaches your browser or anyone else's.
              </p>
              <p>
                Links in Kabsi emails work once, expire after 72 hours and belong to the person they
                were sent to. Opening one never does anything by itself. Profile changes and reviews
                that need care also need that person signed in.
              </p>
            </Block>
            <Block title="How your data is handled">
              <p>
                Kabsi's database is in Frankfurt. The privacy policy lists every provider. Data is
                encrypted in transit. Each business's data is separated at the database level, so
                only its members, and Kabsi staff when helping you, can read it. Review text and
                reviewer names that come from Google are removed 30 days after Google last returned
                them. Kabsi's own Google account is protected with Google's Advanced Protection
                Program. We never sell Google data, use it for advertising or use it to train AI
                models. People at Kabsi read it only with your consent, to keep Kabsi secure, or
                when the law requires it. Read the <Link to="/privacy">privacy policy</Link> for the
                full list of what we keep and who helps us run Kabsi.
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
          <h2 id="never-h" className="text-h2">
            What Kabsi never does
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {NEVER.map((n) => (
              <li key={n} className="rounded-card border border-line p-4 text-body font-semibold">
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
