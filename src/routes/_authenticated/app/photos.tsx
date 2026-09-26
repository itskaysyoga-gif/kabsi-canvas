import { useState, type ChangeEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";

// Photos: the owner uploads, Kabsi checks the photo, the owner picks a category and posts it (D202).
export const Route = createFileRoute("/_authenticated/app/photos")({
  head: () => ({ meta: [{ title: "Photos | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PhotosPage,
});

type Photo = {
  id: string;
  storage_path: string;
  category: string | null;
  suitable: boolean | null;
  suitability_note: string | null;
  state: string;
  created_at: string;
};
const CATEGORIES: Record<string, string> = {
  FOOD_AND_DRINK: "Food & drink",
  PRODUCT: "Product",
  INTERIOR: "Inside",
  EXTERIOR: "Outside",
  TEAMS: "Team at work",
  ADDITIONAL: "Other",
};
const MAX = 5 * 1024 * 1024;

async function loadPhotos(locationId: string) {
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, category, suitable, suitability_note, state, created_at")
    .eq("location_id", locationId)
    .neq("state", "skipped")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  const photos = (data ?? []) as Photo[];
  const urls: Record<string, string> = {};
  if (photos.length) {
    const { data: signed } = await supabase.storage.from("owner-photos").createSignedUrls(
      photos.map((p) => p.storage_path),
      3600,
    );
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  }
  return { photos, urls };
}

function PhotosPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const data = useQuery({
    queryKey: ["photos", loc?.id],
    queryFn: () => loadPhotos(loc!.id),
    enabled: !!loc,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["photos"] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !loc) return;
    setMsg("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return setMsg("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX) return setMsg("That photo is over 5 MB. Try a smaller one.");
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${loc.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("owner-photos")
        .upload(path, file, { contentType: file.type });
      if (up.error) throw new Error("Upload failed. Try again.");
      const { data: id, error } = await supabase.rpc("add_photo", {
        p_location: loc.id,
        p_path: path,
      });
      if (error) throw new Error("Upload failed. Try again.");
      await refresh();
      setMsg("Checking your photo…");
      await contentCall({ do: "photo_check", photo_id: id as string });
      setMsg("");
      await refresh();
    } catch (x) {
      setMsg(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Photos</h1>
      <p className="mt-2 text-kb-stone">
        Add real photos of your place, products and team. Kabsi checks each one before you post it.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc && loc.status === "active" ? (
        <label className="mt-7 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-large border-2 border-dashed border-kb-hairline bg-kb-white p-8 text-center hover:border-kb-black">
          <ImagePlus className="size-8" aria-hidden="true" />
          <span className="font-bold">{busy ? "Working…" : "Add a photo"}</span>
          <span className="text-sm text-kb-stone">JPG, PNG or WebP, up to 5 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onFile(e)}
          />
        </label>
      ) : loc ? (
        <p className="mt-6 text-kb-stone">Photos can be added once your business is active.</p>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {data.data?.photos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            url={data.data!.urls[p.storage_path]}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({
  photo,
  url,
  onChanged,
}: {
  photo: Photo;
  url: string | undefined;
  onChanged: () => unknown;
}) {
  const [category, setCategory] = useState(photo.category ?? "ADDITIONAL");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function run(kind: "publish" | "skip" | "check") {
    setBusy(kind);
    setErr("");
    try {
      if (kind === "publish") {
        await contentCall({ do: "photo_publish", photo_id: photo.id, category });
        track("photo_approved", { channel: "dashboard" });
      } else if (kind === "skip") await contentCall({ do: "photo_skip", photo_id: photo.id });
      else await contentCall({ do: "photo_check", photo_id: photo.id });
      onChanged();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy("");
  }
  return (
    <article className="overflow-hidden rounded-large bg-kb-white shadow-kb">
      {url ? (
        <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="aspect-[4/3] w-full bg-kb-sand" />
      )}
      <div className="p-5">
        {photo.state === "checking" ? (
          <>
            <p className="text-sm text-kb-stone">Not checked yet.</p>
            <Button
              size="compact"
              variant="outline"
              className="mt-3"
              disabled={!!busy}
              onClick={() => void run("check")}
            >
              {busy === "check" ? "Checking…" : "Check photo"}
            </Button>
          </>
        ) : null}
        {photo.state === "draft" ? (
          <>
            <p className={`text-sm font-bold ${photo.suitable ? "text-kb-green" : "text-kb-red"}`}>
              {photo.suitable ? "Looks good for Google" : "Probably not a good fit"}
            </p>
            {photo.suitability_note ? (
              <p className="mt-1 text-sm text-kb-stone">{photo.suitability_note}</p>
            ) : null}
            <label className="mt-3 block text-sm">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-11 w-full rounded-card border border-kb-hairline bg-kb-white px-3"
              >
                {Object.entries(CATEGORIES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="compact" disabled={!!busy} onClick={() => void run("publish")}>
                {busy === "publish" ? "Posting…" : "Post to Google"}
              </Button>
              <Button
                size="compact"
                variant="ghost"
                disabled={!!busy}
                onClick={() => void run("skip")}
              >
                Remove
              </Button>
            </div>
          </>
        ) : null}
        {photo.state === "posted" ? (
          <p className="text-sm font-bold">
            On Google · {CATEGORIES[photo.category ?? "ADDITIONAL"]}
          </p>
        ) : null}
        {photo.state === "failed" ? (
          <p className="text-sm font-bold text-kb-red">Couldn't post this one.</p>
        ) : null}
        {err ? (
          <p className="mt-2 text-sm text-kb-red" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </article>
  );
}
