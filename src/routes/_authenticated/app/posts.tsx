import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { Megaphone as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Google posts (D217): the owner says what's new, Kabsi drafts, the owner edits and posts. Nothing
// goes to Google without the Post click, and it posts exactly the text in the box (D202).
export const Route = createFileRoute("/_authenticated/app/posts")({
  head: () => ({ meta: [{ title: "Posts | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PostsPage,
});

type Post = {
  id: string;
  owner_input: string;
  body: string | null;
  cta_type: string | null;
  state: string;
  source: string;
  keywords: string[] | null;
  created_at: string;
};
// Buttons Google accepts on a post. "Call" uses the phone number on the profile.
const CTA_LABEL: Record<string, string> = {
  CALL: "Call now",
  BOOK: "Book",
  ORDER: "Order online",
  SHOP: "Shop",
  LEARN_MORE: "Learn more",
  SIGN_UP: "Sign up",
};
type Keyword = { keyword: string; source: "search" | "category" | "reviews" };

async function loadPosts(locationId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("gbp_posts")
    .select("id, owner_input, body, cta_type, state, source, keywords, created_at")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as Post[];
}

function PostsPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const posts = useQuery({
    queryKey: ["posts", loc?.id],
    queryFn: () => loadPosts(loc!.id),
    enabled: !!loc,
  });
  const refresh = () =>
    Promise.all(
      [["posts"], ["dashboard"], ["activity"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const drafts = (posts.data ?? []).filter((p) => p.state === "draft");
  const done = (posts.data ?? []).filter((p) => p.state !== "draft");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Google profile</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Posts</h1>
      <p className="mt-2 max-w-xl text-kb-stone">
        Short updates that show on your Google profile. Tell Kabsi what's new in a sentence, or let
        it draft one each week from your facts. Nothing is posted until you tap Post to Google.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc && loc.status !== "active" ? <NotYet /> : null}
      {loc && loc.status === "active" ? (
        <>
          <WeeklyToggle locationId={loc.id} hasFacts={hasFacts(loc.knowledge_card ?? {})} />
          <NewPost locationId={loc.id} onCreated={refresh} />
        </>
      ) : null}
      <div className="mt-7 space-y-5">
        {drafts.map((p) => (
          <DraftCard key={p.id} post={p} onChanged={refresh} />
        ))}
      </div>
      {done.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-bold">Earlier</h2>
          <div className="mt-3 space-y-3">
            {done.map((p) => (
              <div key={p.id} className="rounded-card bg-kb-white p-4 shadow-kb">
                <p className="text-xs font-bold uppercase text-kb-stone">
                  {p.state === "posted"
                    ? "Posted"
                    : p.state === "skipped"
                      ? "Skipped"
                      : "Not posted"}{" "}
                  · {new Date(p.created_at).toLocaleDateString()}
                  {p.source === "auto" ? " · weekly draft" : ""}
                </p>
                <p dir="auto" className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NewPost({ locationId, onCreated }: { locationId: string; onCreated: () => unknown }) {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ideas, setIdeas] = useState<Keyword[] | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const chosen = keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  async function suggest() {
    setIdeasBusy(true);
    setErr("");
    try {
      const r = await contentCall<{ keywords: Keyword[] }>({
        do: "keyword_suggest",
        location_id: locationId,
      });
      setIdeas(r.keywords);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't load suggestions.");
    }
    setIdeasBusy(false);
  }
  function addKeyword(k: string) {
    if (chosen.includes(k.toLowerCase()) || chosen.length >= 5) return;
    setKeywords(chosen.length ? `${keywords.replace(/,\s*$/, "")}, ${k}` : k);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await contentCall<{ grounded?: boolean }>({
        do: "post_draft",
        location_id: locationId,
        owner_input: input,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        cta_type: cta || null,
        cta_url: url || null,
      });
      track("draft_generated", { channel: "dashboard", source: "post" });
      if (r.grounded === false)
        setErr(
          "Draft ready below. Kabsi's check wasn't sure every detail came from your note, so read it closely before posting.",
        );
      setInput("");
      onCreated();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't write the post. Try again.");
    }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <Label htmlFor="what" className="font-bold">
        What's new?
      </Label>
      <Textarea
        id="what"
        dir="auto"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        maxLength={1000}
        className="mt-2 text-base"
        placeholder="e.g. New this week: pistachio croissants, from Tuesday."
      />
      <Label htmlFor="kw" className="mt-4 block text-sm">
        Words customers search for{" "}
        <span className="text-kb-stone">(optional, comma-separated)</span>
      </Label>
      <Input
        id="kw"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="e.g. bakery in Brooklyn, sourdough"
        className="mt-2"
      />
      <p className="mt-2 text-xs text-kb-stone">
        Kabsi works the best fit into the first line of the post, where Google shows it.
      </p>
      {ideas === null ? (
        <Button
          type="button"
          variant="ghost"
          size="compact"
          className="mt-1 px-0 underline"
          disabled={ideasBusy}
          onClick={() => void suggest()}
        >
          {ideasBusy ? "Looking…" : "Suggest phrases"}
        </Button>
      ) : ideas.length ? (
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Suggested phrases">
          {ideas.map((k) => (
            <button
              key={k.keyword}
              type="button"
              onClick={() => addKeyword(k.keyword)}
              disabled={chosen.includes(k.keyword.toLowerCase())}
              title={
                k.source === "search"
                  ? "People searched this and found you on Google"
                  : k.source === "reviews"
                    ? "Customers mention this in reviews"
                    : "Your category and area"
              }
              className="rounded-full border border-kb-hairline bg-kb-sand px-3 py-1 text-sm disabled:opacity-40"
            >
              + {k.keyword}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-kb-stone">
          No suggestions yet. They grow as reviews come in.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cta" className="text-sm">
            Button <span className="text-kb-stone">(optional)</span>
          </Label>
          <select
            id="cta"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="mt-2 h-11 w-full rounded-card border border-kb-hairline bg-kb-white px-3"
          >
            <option value="">No button</option>
            {Object.entries(CTA_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {cta && cta !== "CALL" ? (
          <div>
            <Label htmlFor="url" className="text-sm">
              Button link
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="mt-2"
            />
          </div>
        ) : null}
      </div>
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      <Button type="submit" className="mt-5 w-full" disabled={busy || input.trim().length < 5}>
        {busy ? "Writing…" : "Write my post"}
      </Button>
    </form>
  );
}

function DraftCard({ post, onChanged }: { post: Post; onChanged: () => unknown }) {
  const [text, setText] = useState(post.body ?? "");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function run(kind: "publish" | "skip" | "redraft") {
    setErr("");
    setBusy(kind);
    try {
      if (kind === "publish") {
        await contentCall({ do: "post_publish", post_id: post.id, body: text });
        track("post_approved", { channel: "dashboard" });
      } else if (kind === "skip") {
        await contentCall({ do: "post_skip", post_id: post.id });
      } else {
        const r = await contentCall<{ post: { body: string } }>({
          do: "post_redraft",
          post_id: post.id,
          instruction,
        });
        setText(r.post.body);
        setInstruction("");
      }
      if (kind !== "redraft") onChanged();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Nothing was posted.");
    }
    setBusy("");
  }
  return (
    <article className="rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <p className="text-sm text-kb-stone">
        {post.source === "auto"
          ? "This week's draft, written from your business facts."
          : `You said: “${post.owner_input}”`}
      </p>
      {post.keywords?.length ? (
        <p className="mt-1 text-xs text-kb-stone">Search phrases: {post.keywords.join(", ")}</p>
      ) : null}
      <Label htmlFor={`post-${post.id}`} className="mt-4 block font-bold">
        Your post
      </Label>
      <p className="mt-1 text-sm text-kb-stone">
        Change anything you like. Kabsi posts exactly this text
        {post.cta_type ? ` with a “${CTA_LABEL[post.cta_type] ?? post.cta_type}” button` : ""}.
      </p>
      <Textarea
        id={`post-${post.id}`}
        dir="auto"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        maxLength={1500}
        className="mt-3 text-base leading-7"
      />
      <p className="mt-1 text-right text-xs text-kb-stone">{text.length} / 1500</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          maxLength={300}
          placeholder="Ask for changes, e.g. shorter"
          aria-label="Ask for changes"
        />
        <Button
          variant="outline"
          size="compact"
          disabled={!!busy || !instruction.trim()}
          onClick={() => void run("redraft")}
        >
          {busy === "redraft" ? "Writing…" : "New version"}
        </Button>
      </div>
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!!busy || text.trim().length < 10} onClick={() => void run("publish")}>
          {busy === "publish" ? "Posting…" : "Post to Google"}
        </Button>
        <Button
          variant="ghost"
          disabled={!!busy}
          onClick={() => {
            if (window.confirm("Discard this draft? It won't be posted.")) void run("skip");
          }}
        >
          Discard
        </Button>
      </div>
    </article>
  );
}

// Weekly draft switch (set_auto_posts RPC, members only). The draft still waits for the owner.
function WeeklyToggle({ locationId, hasFacts }: { locationId: string; hasFacts: boolean }) {
  const queryClient = useQueryClient();
  const setting = useQuery({
    queryKey: ["auto-posts", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("auto_posts")
        .eq("id", locationId)
        .single();
      if (error) throw new Error(error.message);
      return (data as { auto_posts: boolean }).auto_posts;
    },
  });
  const [busy, setBusy] = useState(false);
  const on = setting.data ?? true;
  async function toggle() {
    setBusy(true);
    const { error } = await supabase.rpc("set_auto_posts", {
      p_location: locationId,
      p_enabled: !on,
    });
    if (error) window.alert("Couldn't change the weekly draft setting. Try again.");
    else await queryClient.invalidateQueries({ queryKey: ["auto-posts", locationId] });
    setBusy(false);
  }
  return (
    <div className="mt-7 flex items-center justify-between gap-4 rounded-large bg-kb-white p-5 shadow-kb">
      <div>
        <p className="font-bold">Weekly draft</p>
        <p className="text-sm text-kb-stone">
          {on
            ? "Kabsi drafts one post a week from your facts and emails it to you to approve."
            : "Off. Kabsi only writes posts when you ask."}
        </p>
        {on && !hasFacts ? (
          <p className="mt-1 text-sm text-kb-red">
            Weekly drafts need at least one fact.{" "}
            <Link to="/app/knowledge" className="font-bold underline underline-offset-4">
              Add some in About your business
            </Link>
          </p>
        ) : null}
      </div>
      <Button
        variant={on ? "outline" : "default"}
        size="compact"
        disabled={busy || setting.isLoading}
        onClick={() => void toggle()}
        aria-pressed={on}
      >
        {on ? "Turn off" : "Turn on"}
      </Button>
    </div>
  );
}

function NotYet() {
  return (
    <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
      <p className="font-bold">Posts start once Kabsi can reach your Google profile.</p>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        Finish setup and this page fills up with drafts to approve.
      </p>
      <Button asChild size="compact" className="mt-4">
        <Link to="/start">Continue setup</Link>
      </Button>
    </div>
  );
}

const FACT_KEYS = [
  "about",
  "services",
  "price_notes",
  "booking",
  "payment_methods",
  "hours_note",
  "service_area",
  "delivery",
  "parking",
  "accessibility",
  "wifi",
  "languages",
  "policies",
  "mention",
];
function hasFacts(card: Record<string, unknown>) {
  return (
    FACT_KEYS.some(
      (k) => (typeof card[k] === "string" && (card[k] as string).trim()) || card[k] === true,
    ) ||
    (Array.isArray(card["faqs"]) && (card["faqs"] as unknown[]).length > 0)
  );
}
