import { useState, type ChangeEvent, type ReactNode } from "react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { ImagePlus as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";
import { CopyButton } from "@/components/shared/copy-button";
import { SendReviewLink } from "@/components/shared/send-review-link";
import { usePlaceLink } from "@/lib/place-link";
import { myAccess } from "@/lib/team";
import {
  ACCEPT,
  CATEGORIES,
  createLink,
  linkStatus,
  loadPhotos,
  revokeLink,
  roleIssue,
  uploadFiles,
  type Photo,
} from "@/lib/photos";

// Photos (P0.5-01, K-23): add up to 20 from the camera or the gallery; Kabsi's photo engine checks each one in the
// background and removes its location data; the owner approves them all at once or one by one, and each approved photo
// goes to Google once through the one pipeline (D202). The preferred cover photo and logo, and a staff upload link.
export const Route = createFileRoute("/_authenticated/app/photos")({
  head: () => ({ meta: [{ title: "Photos | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PhotosPage,
});

function PhotosPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const data = useQuery({
    queryKey: ["photos", loc?.id],
    queryFn: () => loadPhotos(loc!.id),
    enabled: !!loc,
    // While a photo is being checked, look again every 10 seconds.
    refetchInterval: (q) =>
      q.state.data?.photos.some((p) => p.state === "checking") ? 10_000 : false,
  });
  const refresh = () =>
    Promise.all(
      [["photos"], ["dashboard"], ["activity"], ["tasks"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const access = useQuery({
    queryKey: ["my-access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const role = access.data?.role;
  const placeLink = usePlaceLink(role === "staff" ? loc?.id : undefined);
  const canWork = !!loc && loc.status === "active" && !loc.concierge;
  const photos = data.data?.photos ?? [];
  const urls = data.data?.urls ?? {};
  const ready = photos.filter((p) => p.state === "draft" && p.kind === "photo");
  const approvesHere = role === "owner" || role === "manager";

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !loc) return;
    setMsg("");
    setBusy(true);
    const r = await uploadFiles(loc.id, files);
    await refresh();
    setMsg(
      [
        r.added
          ? `${r.added} ${r.added === 1 ? "photo is" : "photos are"} being checked. This takes a minute.`
          : "",
        r.note,
      ]
        .filter(Boolean)
        .join(" "),
    );
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-small font-bold uppercase tracking-wider text-text-2">Content</p>
      <h1 className="mt-1 font-display text-h2 leading-none sm:text-5xl">Photos</h1>
      <p className="mt-2 text-text-2">
        Add real photos of your place, your team, your work and what you sell. Kabsi checks each one
        before you approve it.
      </p>
      <p className="mt-3 flex items-start gap-2 text-small">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Kabsi removes location data from every photo before it goes to Google.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="Photos" /> : null}

      {canWork ? (
        <div className="mt-7 grid grid-cols-2 gap-3">
          <UploadButton
            icon={<Camera className="size-6" aria-hidden="true" />}
            label="Take a photo"
            capture
            busy={busy}
            onChange={onFiles}
          />
          <UploadButton
            icon={<ImagePlus className="size-6" aria-hidden="true" />}
            label="Choose photos"
            busy={busy}
            onChange={onFiles}
          />
          <p className="col-span-2 text-small text-text-2">
            Up to 20 at a time, 20 MB each. JPG, PNG, WebP or HEIC. Videos are kept for 30 days;
            sending videos to Google comes later.
          </p>
        </div>
      ) : loc && !loc.concierge ? (
        <p className="mt-6 text-text-2">Photos can be added once your business is active.</p>
      ) : null}
      {msg ? (
        <p className="mt-3 text-small" role="status">
          {msg}
        </p>
      ) : null}
      {loc && role === "staff" ? (
        <div className="mt-6">
          <SendReviewLink name={loc.name} link={placeLink.data} />
        </div>
      ) : null}
      {data.isError ? (
        <p className="mt-6 text-small text-bad" role="alert">
          Couldn't load your photos. Refresh the page to try again.
        </p>
      ) : null}

      {canWork && loc && ready.length && approvesHere ? (
        <ReadyBatch locationId={loc.id} ready={ready} urls={urls} onChanged={refresh} />
      ) : null}
      {canWork && ready.length && !approvesHere ? (
        <p className="mt-8 rounded-panel bg-surface-1 p-5 shadow-rest">
          {ready.length} {ready.length === 1 ? "photo is" : "photos are"} ready. The owner approves
          them.
        </p>
      ) : null}

      <Checking photos={photos} />

      {canWork ? <CoverAndLogo photos={photos} urls={urls} /> : null}

      <Section title="Sending to Google" list={photos.filter((p) => p.state === "publishing")}>
        {(p) => <Tile key={p.id} photo={p} url={urls[p.storage_path]} label="Sending to Google" />}
      </Section>
      <Section title="On Google" list={photos.filter((p) => p.state === "posted")}>
        {(p) => (
          <Tile
            key={p.id}
            photo={p}
            url={urls[p.storage_path]}
            label={CATEGORIES[p.category ?? "ADDITIONAL"] ?? "Other"}
          />
        )}
      </Section>
      <Section title="Couldn't post" list={photos.filter((p) => p.state === "failed")}>
        {(p) => <Tile key={p.id} photo={p} url={urls[p.storage_path]} label="Not on Google" />}
      </Section>

      {canWork && approvesHere && loc ? <StaffLink locationId={loc.id} /> : null}
    </div>
  );
}

function UploadButton({
  icon,
  label,
  capture = false,
  busy,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  capture?: boolean;
  busy: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line bg-surface-1 p-4 text-center font-bold hover:border-text-1">
      {icon}
      {busy ? "Working…" : label}
      <input
        type="file"
        accept={capture ? "image/*" : ACCEPT}
        multiple={!capture}
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        disabled={busy}
        onChange={onChange}
      />
    </label>
  );
}

// The batch card (K-23): "3 photos are ready", Approve all, or one by one below it.
function ReadyBatch({
  locationId,
  ready,
  urls,
  onChanged,
}: {
  locationId: string;
  ready: Photo[];
  urls: Record<string, string>;
  onChanged: () => unknown;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const clean = ready.filter((p) => p.suitable);
  async function approveAll() {
    setBusy(true);
    setErr("");
    try {
      const r = await contentCall<{ approved: number }>({
        do: "photos_approve_all",
        location_id: locationId,
      });
      track("photo_approved", { channel: "dashboard" });
      setDone(
        `${r.approved} ${r.approved === 1 ? "photo goes" : "photos go"} to Google in a few minutes.`,
      );
      onChanged();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  return (
    <section className="mt-8">
      <div className="rounded-panel bg-surface-1 p-5 shadow-rest">
        <h2 className="font-display text-h3 leading-tight">
          {ready.length} {ready.length === 1 ? "photo is" : "photos are"} ready
        </h2>
        <p className="mt-1 text-small text-text-2">
          {clean.length === ready.length
            ? "Kabsi checked them and removed the location data."
            : `Kabsi has a note on ${ready.length - clean.length} of them. Look at those one by one below.`}
        </p>
        {clean.length ? (
          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={busy}
            onClick={() => void approveAll()}
          >
            {busy
              ? "Approving…"
              : clean.length === ready.length
                ? "Approve all"
                : `Approve the ${clean.length} without a note`}
          </Button>
        ) : null}
        {done ? (
          <p className="mt-3 text-small" role="status">
            {done}
          </p>
        ) : null}
        {err ? (
          <p className="mt-3 text-small text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {ready.map((p) => (
          <ReadyCard key={p.id} photo={p} url={urls[p.storage_path]} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

function ReadyCard({
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
  const advice =
    (category === "COVER" || category === "LOGO") && photo.width && photo.height
      ? roleIssue(category, photo.width, photo.height)
      : null;
  async function run(kind: "publish" | "skip") {
    setBusy(kind);
    setErr("");
    try {
      if (kind === "publish") {
        await contentCall({ do: "photo_publish", photo_id: photo.id, category });
        track("photo_approved", { channel: "dashboard" });
      } else await contentCall({ do: "photo_skip", photo_id: photo.id });
      onChanged();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy("");
  }
  return (
    <article className="overflow-hidden rounded-panel bg-surface-1 shadow-rest">
      <PhotoImage url={url} />
      <div className="p-5">
        <p className={`text-small font-bold ${photo.suitable ? "text-ok" : "text-bad"}`}>
          {photo.suitable ? "Looks good for Google" : "Kabsi has a note"}
        </p>
        {photo.suitability_note ? (
          <p className="mt-1 text-small text-text-2">{photo.suitability_note}</p>
        ) : null}
        <label className="mt-3 block text-small">
          What it shows
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 h-11 w-full rounded-card border border-line bg-surface-1 px-3"
          >
            {Object.entries(CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {advice ? <p className="mt-2 text-small text-text-2">{advice}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="compact"
            variant="outline"
            disabled={!!busy}
            onClick={() => void run("publish")}
          >
            {busy === "publish" ? "Approving…" : photo.suitable ? "Approve" : "Approve anyway"}
          </Button>
          <Button size="compact" variant="ghost" disabled={!!busy} onClick={() => void run("skip")}>
            Don't post
          </Button>
        </div>
        {err ? (
          <p className="mt-2 text-small text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// Uploads still being checked, files Kabsi could not use, and kept videos: a short list with the reason.
function Checking({ photos }: { photos: Photo[] }) {
  const queryClient = useQueryClient();
  const checking = photos.filter((p) => p.state === "checking");
  const notes = photos.filter((p) => p.state === "refused" || p.state === "held");
  if (!checking.length && !notes.length) return null;
  async function dismiss(id: string) {
    await contentCall({ do: "photo_skip", photo_id: id }).catch(() => null);
    await queryClient.invalidateQueries({ queryKey: ["photos"] });
  }
  return (
    <section className="mt-8">
      {checking.length ? (
        <p className="rounded-panel bg-surface-1 p-5 text-small shadow-rest" role="status">
          Kabsi is checking {checking.length} {checking.length === 1 ? "photo" : "photos"}. This
          takes a minute.
        </p>
      ) : null}
      {notes.length ? (
        <ul className="mt-3 grid gap-2">
          {notes.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-card bg-surface-1 p-4 text-small shadow-rest"
            >
              <span>
                <span className="font-bold">
                  {p.kind === "video" ? "Video kept. " : "Not added. "}
                </span>
                {p.suitability_note}
              </span>
              <Button size="compact" variant="ghost" onClick={() => void dismiss(p.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// The preferred cover photo and logo (K-23). Google decides what it shows, so Kabsi says "preferred".
function CoverAndLogo({ photos, urls }: { photos: Photo[]; urls: Record<string, string> }) {
  const latest = (cat: string) =>
    photos.find((p) => p.category === cat && (p.state === "posted" || p.state === "publishing"));
  const tiles: [string, string, Photo | undefined][] = [
    ["COVER", "Your preferred cover photo", latest("COVER")],
    ["LOGO", "Your logo", latest("LOGO")],
  ];
  return (
    <section className="mt-10">
      <h2 className="text-small font-bold uppercase tracking-wider text-text-2">Cover and logo</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {tiles.map(([cat, title, p]) => {
          const advice =
            p?.width && p.height ? roleIssue(cat as "COVER" | "LOGO", p.width, p.height) : null;
          return (
            <div key={cat} className="overflow-hidden rounded-panel bg-surface-1 shadow-rest">
              <PhotoImage url={p ? urls[p.storage_path] : undefined} square={cat === "LOGO"} />
              <div className="p-4">
                <p className="text-small font-bold">{title}</p>
                <p className="mt-1 text-small text-text-2">
                  {p
                    ? p.state === "publishing"
                      ? "Sending to Google."
                      : (advice ?? "On Google.")
                    : cat === "COVER"
                      ? "None yet. Choose Preferred cover photo on a ready photo. A wide photo works best."
                      : "None yet. Choose Logo on a ready photo. A square one works best."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-small text-text-2">
        Google decides which photo it shows first, so Kabsi calls these your preferred ones.
      </p>
    </section>
  );
}

// The staff upload link (K-23): uploads only, no account, turned off at any time.
function StaffLink({ locationId }: { locationId: string }) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["photo-link", locationId],
    queryFn: () => linkStatus(locationId),
  });
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run(make: boolean) {
    setBusy(true);
    setErr("");
    try {
      if (make) setLink(await createLink(locationId));
      else {
        await revokeLink(locationId);
        setLink("");
      }
      await queryClient.invalidateQueries({ queryKey: ["photo-link", locationId] });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  const active = status.data?.active === true;
  return (
    <section className="mt-10 rounded-panel bg-surface-1 p-5 shadow-rest">
      <h2 className="flex items-center gap-2 font-bold">
        <Link2 className="size-4" aria-hidden="true" />
        Staff upload link
      </h2>
      <p className="mt-1 text-small text-text-2">
        Anyone with this link can add photos for you to approve, without an account. It cannot see
        or change anything else.
      </p>
      {link ? (
        <div className="mt-4">
          <p className="break-all rounded-card bg-surface-2 p-3 text-small">{link}</p>
          <p className="mt-2 text-small text-text-2">
            Copy it now. Kabsi shows it only once; make a new one if you lose it.
          </p>
          <div className="mt-3">
            <CopyButton text={link} label="Copy link" />
          </div>
        </div>
      ) : active ? (
        <p className="mt-3 text-small">
          A link is on.{" "}
          {status.data?.uploads
            ? `${status.data.uploads} ${status.data.uploads === 1 ? "photo" : "photos"} added through it.`
            : "Nothing added through it yet."}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="compact" variant="outline" disabled={busy} onClick={() => void run(true)}>
          {active || link ? "Make a new link" : "Make a link"}
        </Button>
        {active || link ? (
          <Button size="compact" variant="ghost" disabled={busy} onClick={() => void run(false)}>
            Turn the link off
          </Button>
        ) : null}
      </div>
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

function Section({
  title,
  list,
  children,
}: {
  title: string;
  list: Photo[];
  children: (p: Photo) => ReactNode;
}) {
  if (!list.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-small font-bold uppercase tracking-wider text-text-2">
        {title} · {list.length}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{list.map(children)}</div>
    </section>
  );
}

function Tile({ photo, url, label }: { photo: Photo; url: string | undefined; label: string }) {
  return (
    <figure className="overflow-hidden rounded-card bg-surface-1 shadow-rest">
      <PhotoImage url={url} />
      <figcaption className="p-3 text-small font-bold">
        {label}
        {photo.source === "staff_link" ? (
          <span className="block font-normal text-text-2">From the staff link</span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function PhotoImage({ url, square = false }: { url: string | undefined; square?: boolean }) {
  const shape = square ? "aspect-square" : "aspect-[4/3]";
  return url ? (
    <img
      src={url}
      alt="Your photo"
      width={800}
      height={square ? 800 : 600}
      loading="lazy"
      decoding="async"
      className={`${shape} w-full object-cover`}
    />
  ) : (
    <div className={`${shape} w-full bg-surface-2`} />
  );
}
