import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { RemoveKabsi } from "@/components/kabsi/d5-access";
import { KABSI_GROUP_ID, KABSI_GROUP_NAME, pageHead } from "@/lib/site";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Kabsi: Security and your Google profile",
      description:
        "How Kabsi uses Manager access, waits for your approval, stores Google data, and can be removed from your Google Business Profile.",
      path: "/security",
      image: "about",
      crumbs: [{ name: "Security", path: "/security" }],
    }),
  component: SecurityPage,
});

// The full text is kabsi-canvas's own, written to the system as built; the layout and the remove recording are the
// design studio's (Design 5 round 2: the remove recording sits here only).
function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      updated="27 October 2026"
      summary={[
        "Kabsi never sees your Google password.",
        "You can remove Kabsi as a Manager any time.",
        "Nothing goes live without your yes.",
        "Report a problem: hello@kabsi.co.",
      ]}
    >
      <section>
        <h2>What a Manager can do</h2>
        <p>
          Google gives a Manager access to help run a profile. You can read about the{" "}
          <a href="https://support.google.com/business/answer/3403100">
            roles on Google's own page
          </a>
          . You stay the owner.
        </p>
      </section>

      <section>
        <h2>What Kabsi does with that access</h2>
        <p>
          Kabsi reads new reviews, prepares reply drafts, and posts only what you approved. Every
          reply, post, photo and change shows you the exact text first and waits for your tap. Kabsi
          cannot post on its own. Every Google action happens inside Kabsi, for the business that
          asked. Kabsi gives no one else, partners included, a way to read or write your Google
          data.
        </p>
      </section>

      <section>
        <h2>Disconnect Kabsi</h2>
        <p>
          In Kabsi, open <strong>Settings</strong> and choose{" "}
          <strong>Disconnect Kabsi from Google</strong>. Only the signed-in owner can do it. Kabsi
          stops at once, cancels what was waiting for your approval and then removes its own Manager
          access. You get an email that confirms it. If Google does not let Kabsi remove itself, our
          team does it within 7 business days and tells you the date.
        </p>
        <p>
          You can also do it on Google, without asking us. Open{" "}
          <strong>Business Profile settings</strong>, choose <strong>People and access</strong>,
          then remove <strong>{KABSI_GROUP_NAME}</strong> (group ID {KABSI_GROUP_ID}). Kabsi loses
          access to that profile at once.
        </p>
        <RemoveKabsi className="mt-8 rounded-card border border-line p-5" />
      </section>

      <section>
        <h2>Notice of any change</h2>
        <p>
          When Kabsi accepts your Manager invitation, or anything about its access changes, we email
          you within 48 hours to say what changed and how to remove Kabsi. This is separate from the
          notices Google sends.
        </p>
      </section>

      <section>
        <h2>How you sign in, and what we never ask</h2>
        <p>
          You sign in with a one-time code sent to your email. There are no passwords. Kabsi never
          asks for your Google password or a Google verification code, and does not store a Google
          token of yours. Kabsi's own access to Google is held on our servers and never reaches your
          browser or anyone else's.
        </p>
        <p>
          Links in Kabsi emails work once, expire after 72 hours and belong to the person they were
          sent to. Opening one never does anything by itself. Profile changes and reviews that need
          care also need that person signed in.
        </p>
      </section>

      <section>
        <h2>How your data is handled</h2>
        <p>
          Your data is stored in the EU, in Frankfurt, and encrypted in transit. Each business's
          data is separated at the database level, so only its members, and Kabsi staff when helping
          you, can read it. Review text and reviewer names that come from Google are removed 30 days
          after Google last returned them. Kabsi's own Google account is protected with Google's
          Advanced Protection Program. We never sell Google data, use it for advertising or use it
          to train AI models. People at Kabsi read it only with your consent, to keep Kabsi secure,
          or when the law requires it. Read the <Link to="/privacy">privacy policy</Link> for the
          full list of what we keep and who helps us run Kabsi.
        </p>
      </section>

      <section>
        <h2>Who to ask</h2>
        <p>
          Write to <a href="mailto:hello@kabsi.co">hello@kabsi.co</a>. A person replies.
        </p>
      </section>

      <p className="border-t border-line pt-8 font-bold text-text-1">
        Kabsi is independent and not affiliated with Google.
      </p>
    </LegalPage>
  );
}
