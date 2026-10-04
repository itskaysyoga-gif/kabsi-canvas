import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { amStaff } from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ExampleBadge } from "@/components/ui/example-badge";
import { KabsiCard } from "@/components/ui/kabsi-card";
import { StepList } from "@/components/ui/step-list";
import { Banner } from "@/components/ui/banner";

// Staff-only reference for every design token and shared component (K-108). Not linked from anywhere,
// noindex, and listed in robots.txt. Anyone who is not staff is sent to the app.
export const Route = createFileRoute("/_authenticated/design")({
  head: () => ({ meta: [{ title: "Design | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: DesignPage,
});

const COLOURS = [
  ["kb-yellow", "bg-kb-yellow", "The one primary action, and the needs-you highlight"],
  ["kb-yellow-pressed", "bg-kb-yellow-pressed", "Pressed state of the primary button"],
  ["kb-black", "bg-kb-black", "Hero and closing bands, primary text"],
  ["kb-carbon", "bg-kb-carbon", "Dark surfaces"],
  ["kb-ink", "bg-kb-ink", "Body text"],
  ["kb-white", "bg-kb-white", "Page and card background"],
  ["kb-sand", "bg-kb-sand", "Alternate sections, app background"],
  ["kb-stone", "bg-kb-stone", "Secondary text"],
  ["kb-stone-on-dark", "bg-kb-stone-on-dark", "Secondary text on black"],
  ["kb-hairline", "bg-kb-hairline", "Borders"],
  ["kb-green", "bg-kb-green", "Done, published, Google Protection on"],
  ["kb-red", "bg-kb-red", "Real problems only"],
  ["kb-amber", "bg-kb-amber", "Needs your attention (text, on kb-amber-soft)"],
  ["kb-amber-soft", "bg-kb-amber-soft", "Background for amber text"],
] as const;

const TYPE = [
  ["text-kb-hero", "font-display", "Hero, Lalezar 56 to 80 px"],
  ["text-kb-section", "font-display", "Section heading, Lalezar 36 to 44 px"],
  ["text-kb-lead", "", "Marketing body, 18 px"],
  ["text-kb-body", "", "App body, 16 px"],
  ["text-kb-small", "", "Secondary text, 14 px"],
  ["text-kb-caption", "", "Smallest allowed, 13 px"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-kb-section">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DesignPage() {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  if (staff.isLoading) return <p className="p-8 text-kb-stone">Loading…</p>;
  if (staff.data !== true) return <Navigate to="/app" replace />;
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Design</h1>
      <p className="mt-3 text-kb-small text-kb-stone">
        Every token and shared component. Values live in the one theme block in styles.css. Staff
        only.
      </p>

      <Section title="Colour">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COLOURS.map(([name, cls, use]) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-card border border-kb-hairline p-3"
            >
              <span className={`size-12 shrink-0 rounded-lg border border-kb-hairline ${cls}`} />
              <div className="min-w-0">
                <p className="text-kb-small font-bold">{name}</p>
                <p className="text-kb-caption text-kb-stone">{use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="space-y-4">
          {TYPE.map(([cls, font, note]) => (
            <div key={cls}>
              <p className="text-kb-caption text-kb-stone">
                {cls}: {note}
              </p>
              <p className={`${cls} ${font}`}>Your reviews and listing. Taken care of.</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing, radius and shadow">
        <div className="flex flex-wrap gap-4">
          {(
            [
              "rounded-sm",
              "rounded-md",
              "rounded-lg",
              "rounded-xl",
              "rounded-card",
              "rounded-large",
              "rounded-pill",
            ] as const
          ).map((r) => (
            <div key={r} className="text-center">
              <div className={`size-16 border-2 border-kb-black bg-kb-sand ${r}`} />
              <p className="mt-1 text-kb-caption text-kb-stone">{r}</p>
            </div>
          ))}
          <div className="text-center">
            <div className="size-16 rounded-card bg-kb-white shadow-kb" />
            <p className="mt-1 text-kb-caption text-kb-stone">shadow-kb</p>
          </div>
          <div className="text-center">
            <div className="size-16 rounded-card bg-kb-white shadow-kb-lift" />
            <p className="mt-1 text-kb-caption text-kb-stone">shadow-kb-lift</p>
          </div>
        </div>
        <p className="mt-4 text-kb-small text-kb-stone">
          Sections: py-kb-section on desktop, py-kb-section-sm on phones. Gutter: gap-kb-gutter.
          Container: max-w-kb.
        </p>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Approve reply</Button>
          <Button variant="secondary">Edit</Button>
          <Button variant="tertiary">Skip</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <p className="mt-3 text-kb-small text-kb-stone">One primary (yellow) button per screen.</p>
      </Section>

      <Section title="Status pill">
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="green">Published</StatusPill>
          <StatusPill tone="amber">Needs your attention</StatusPill>
          <StatusPill tone="red">Disconnected</StatusPill>
          <StatusPill tone="grey">Draft</StatusPill>
        </div>
      </Section>

      <Section title="Example badge">
        <div className="flex items-center gap-3">
          <ExampleBadge />
          <ExampleBadge>Example data</ExampleBadge>
        </div>
      </Section>

      <Section title="Banner">
        <div className="space-y-3">
          <Banner tone="info" title="Info">
            Plain notice on sand.
          </Banner>
          <Banner
            tone="needsYou"
            title="Needs you"
            action={
              <Button variant="primary" size="compact">
                Review reply
              </Button>
            }
          >
            The one place yellow appears besides a primary button.
          </Banner>
          <Banner tone="attention" title="Needs your attention">
            Amber text on soft amber.
          </Banner>
          <Banner tone="success" title="All caught up">
            Green means done.
          </Banner>
          <Banner tone="problem" title="Google rejected the change">
            Red is for real problems only.
          </Banner>
        </div>
      </Section>

      <Section title="Kabsi card">
        <div className="grid gap-4 sm:grid-cols-2">
          <KabsiCard
            needsYou
            eyebrow={
              <>
                New review, 4 stars <ExampleBadge className="ml-1" />
              </>
            }
            title="Sam wrote about the service"
            status={{ label: "Draft ready", tone: "amber" }}
            draft="Thank you, Sam. We are glad the visit went well and we hope to see you again soon."
            note="Nothing is published until you approve it."
            actions={
              <>
                <Button variant="primary" size="compact">
                  Approve reply
                </Button>
                <Button variant="tertiary">Edit</Button>
              </>
            }
          />
          <KabsiCard
            eyebrow={
              <>
                Reply <ExampleBadge className="ml-1" />
              </>
            }
            title="Published on Google"
            status={{ label: "Published", tone: "green" }}
            note="Kabsi checked that it shows on your profile."
          />
        </div>
      </Section>

      <Section title="Step list">
        <StepList
          current={1}
          steps={[
            { title: "Find your business", description: "We found your listing." },
            { title: "Add Kabsi as Manager", description: "Takes about two minutes." },
            { title: "Confirm your details" },
          ]}
        />
      </Section>
    </main>
  );
}
