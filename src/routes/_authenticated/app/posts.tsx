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

// Google posts (D217): the owner says what's new, Kabsi drafts, the owner edits and posts. Nothing
// goes to Google without the Post click, and it posts exactly the text in the box (D202).
export const Route = createFileRoute("/_authenticated/app/posts")({
  head: () => ({ meta: [{ title: "Posts — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PostsPage,
});

type Post = {
  id: string;
  owner_input: string;
  body: string | null;
  cta_type: string | null;
  state: string;
  created_at: string;
};
const CTA_LABEL: Record<string, string> = {
  CALL: "Call",
  BOOK: "Book",
  ORDER: "Order online",
  LEARN_MORE: "Learn more",
  GET_DIRECTIONS: "Get directions",
};

async function loadPosts(locationId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("gbp_posts")
    .select("id, owner_input, body, cta_type, state, created_at")
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
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["posts"] });
  const drafts = (posts.data ?? []).filter((p) => p.state === "draft");
  const done = (posts.data ?? []).filter((p) => p.state !== "draft");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Posts</h1>
      <p className="mt-2 text-kb-stone">
        Share what's new on your Google profile. Tell Kabsi in a sentence, and it writes the post.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc && loc.status !== "active" ? (
        <p className="mt-6 text-kb-stone">Posts start once your business is active.</p>
      ) : null}
      {loc && loc.status === "active" ? <NewPost locationId={loc.id} onCreated={refresh} /> : null}
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
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await contentCall({
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
        placeholder="e.g. New this week: zaatar croissants, from Tuesday."
      />
      <Label htmlFor="kw" className="mt-4 block text-sm">
        Words customers search for{" "}
        <span className="text-kb-stone">(optional, comma-separated)</span>
      </Label>
      <Input
        id="kw"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="e.g. bakery in Hamra, sourdough"
        className="mt-2"
      />
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
      <p className="text-sm text-kb-stone">You said: “{post.owner_input}”</p>
      <Label htmlFor={`post-${post.id}`} className="mt-4 block font-bold">
        Your post
      </Label>
      <p className="mt-1 text-sm text-kb-stone">
        Change anything you like. Kabsi posts exactly this text
        {post.cta_type ? ` with a “${CTA_LABEL[post.cta_type]}” button` : ""}.
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
        <Button variant="ghost" disabled={!!busy} onClick={() => void run("skip")}>
          Discard
        </Button>
      </div>
    </article>
  );
}
