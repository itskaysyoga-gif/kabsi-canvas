import { useState, type ChangeEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, ShieldCheck } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { CopyField } from "@/components/kabsi/d2-parts";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { OpensLater, TaskBlock, useFirstTaskDone } from "@/components/kabsi/d3-content-task";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  StatusPill,
  WhatsAppLink,
} from "@/components/kabsi/ui";
import { SendReviewLink } from "@/components/shared/send-review-link";
import { myLatestLocation } from "@/lib/onboarding";
import { usePlaceLink } from "@/lib/place-link";
import { contentCall } from "@/lib/reviews";
import { WHATSAPP_ON } from "@/lib/site";
import { latestByTarget, recentTasks, type TaskItem } from "@/lib/task-feed";
import { myAccess } from "@/lib/team";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
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

// Photos (P0.5-01, K-23; Design 3's Photos tab): send photos on WhatsApp or add them here; Kabsi's photo engine checks
// each one and removes its location data; the owner approves them all at once or one by one, and each approved photo
// goes to Google once through the one pipeline (D202) and shows its task state. The preferred cover photo and logo, and
// the team photo link. V4: the photo ask and the team link open after the first task is done. Staff (K-16) add photos
// and share the review link here; they approve nothing.
export const Route = createFileRoute("/_authenticated/app/photos")({
  head: () => ({ meta: [{ title: "Photos | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PhotosPage,
});

const SENT = ["publishing", "posted", "failed"];

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
  const access = useQuery({
    queryKey: ["my-access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const role = access.data?.role;
  const approvesHere = role === "owner" || role === "manager";
  const canWork = !!loc && loc.status === "active" && !loc.concierge;
  const feed = useQuery({
    queryKey: ["photo-tasks", loc?.id],
    queryFn: () => recentTasks(loc!.id, { kinds: ["photo"], days: 120, limit: 100 }),
    enabled: canWork && approvesHere,
    retry: false,
  });
  const firstDone = useFirstTaskDone(canWork && approvesHere ? loc?.id : undefined);
  const placeLink = usePlaceLink(role === "staff" ? loc?.id : undefined);
  const refresh = () =>
    Promise.all(
      [["photos"], ["photo-tasks"], ["dashboard"], ["activity"], ["tasks"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const photos = data.data?.photos ?? [];
  const urls = data.data?.urls ?? {};
  const ready = photos.filter((p) => p.state === "draft" && p.kind === "photo");
  const sent = photos.filter((p) => SENT.includes(p.state));
  const tasks = latestByTarget(feed.data ?? []);
  // Staff are never held back: they only exist once the owner has a team. Owners wait for the first task (V4).
  const open = role === "staff" || firstDone === true;

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
    <>
      <AccountTop title="Photos" />
      {!location.isLoading && !loc ? <ButtonLink to="/start">Add your business</ButtonLink> : null}
      {loc?.concierge ? <EarlyAccessNotice what="Photos" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? (
        <Panel>
          <p className="text-body font-bold">Photos can be added once your business is active.</p>
        </Panel>
      ) : null}

      {canWork && access.data ? (
        <div className="space-y-6">
          {open ? (
            <Panel>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2">
                  <Camera className="size-7" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-h3 font-bold">
                    {WHATSAPP_ON && role !== "staff" ? "Send photos on WhatsApp" : "Add photos"}
                  </h2>
                  <p className="mt-1 text-body text-text-2">
                    {WHATSAPP_ON && role !== "staff"
                      ? "Send a photo to Kabsi. It checks the size and light, gets it ready and asks for your yes before it goes on Google. On Essentials and Pro."
                      : role === "staff"
                        ? "Add real photos of your place, your team, your work and what you sell. Kabsi checks each one, and the owner approves it."
                        : "Add real photos of your place, your team, your work and what you sell. Kabsi checks each one before you approve it."}
                  </p>
                </div>
                {role !== "staff" ? <WhatsAppLink label="Send a photo" size="md" /> : null}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
                <UploadButton
                  icon={<Camera className="size-6" aria-hidden />}
                  label="Take a photo"
                  capture
                  busy={busy}
                  onChange={onFiles}
                />
                <UploadButton
                  icon={<ImagePlus className="size-6" aria-hidden />}
                  label="Choose photos"
                  busy={busy}
                  onChange={onFiles}
                />
                <p className="col-span-2 text-small text-text-2">
                  Up to 20 at a time, 20 MB each. JPG, PNG, WebP or HEIC. Videos are kept for 30
                  days; sending videos to Google comes later.
                </p>
                <p className="col-span-2 flex items-start gap-2 text-small text-text-1">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Kabsi removes location data from every photo before it goes to Google.
                </p>
              </div>
              {msg ? (
                <p className="mt-3 text-small text-text-1" role="status">
                  {msg}
                </p>
              ) : null}
            </Panel>
          ) : firstDone === false ? (
            <OpensLater />
          ) : null}

          {role === "staff" && loc ? (
            <SendReviewLink name={loc.name} link={placeLink.data} />
          ) : null}

          {data.isError ? (
            <ErrorState title="This page did not load." onRetry={() => void data.refetch()}>
              Nothing you did, and nothing changed on Google. Try again in a minute.
            </ErrorState>
          ) : null}

          {ready.length && approvesHere ? (
            <ReadyBatch locationId={loc.id} ready={ready} urls={urls} onChanged={refresh} />
          ) : null}
          {ready.length && !approvesHere ? (
            <Panel>
              <p className="text-body text-text-1">
                {ready.length} {ready.length === 1 ? "photo is" : "photos are"} ready. The owner
                approves them.
              </p>
            </Panel>
          ) : null}

          <Checking photos={photos} />

          {data.data && !photos.length && open && approvesHere ? (
            <EmptyState icon={Camera} title="No photos sent yet.">
              {WHATSAPP_ON
                ? "Send your first photo on WhatsApp. Your work, your team or your place."
                : "Add your first photo above. Your work, your team or your place."}
            </EmptyState>
          ) : null}

          {sent.length ? (
            <section aria-labelledby="sent-photos">
              <h2 id="sent-photos" className="font-display text-h3 font-bold">
                Sent to Google
              </h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sent.map((p) => (
                  <SentTile
                    key={p.id}
                    photo={p}
                    url={urls[p.storage_path]}
                    task={tasks.get(p.id)}
                    approvesHere={approvesHere}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {approvesHere && open ? <CoverAndLogo photos={photos} urls={urls} /> : null}

          {approvesHere && open && loc ? <TeamLink locationId={loc.id} /> : null}
        </div>
      ) : null}
    </>
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
    <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-inner border border-dashed border-line-strong bg-surface-2 p-4 text-center text-body font-bold text-text-1 focus-within:outline-2 focus-within:outline-text-1 hover:border-text-1">
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
  // One yellow button: Approve all when there are several, else the one photo's Approve photo.
  const batch = clean.length > 1;
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
    <section className="space-y-4" aria-labelledby="ready-photos">
      <Panel>
        <h2 id="ready-photos" className="font-display text-h3 font-bold">
          {ready.length} {ready.length === 1 ? "photo is" : "photos are"} ready
        </h2>
        <p className="mt-1 text-body text-text-2">
          {clean.length === ready.length
            ? "Kabsi checked them and removed the location data."
            : `Kabsi has a note on ${ready.length - clean.length} of them. Look at those one by one below.`}
        </p>
        {batch ? (
          <Button
            size="md"
            data-main-cta
            className="mt-4 w-full sm:w-auto"
            loading={busy}
            onClick={() => void approveAll()}
          >
            {clean.length === ready.length
              ? "Approve all"
              : `Approve the ${clean.length} without a note`}
          </Button>
        ) : null}
        {done ? (
          <p className="mt-3 text-small text-text-1" role="status">
            {done}
          </p>
        ) : null}
        {err ? (
          <p className="mt-3 text-small font-semibold text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </Panel>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ready.map((p, i) => (
          <ReadyCard
            key={p.id}
            photo={p}
            url={urls[p.storage_path]}
            primary={!batch && i === ready.findIndex((x) => x.suitable)}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}

function ReadyCard({
  photo,
  url,
  primary,
  onChanged,
}: {
  photo: Photo;
  url: string | undefined;
  primary: boolean;
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
    <li className="overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest">
      <PhotoImage url={url} />
      <div className="p-4">
        <StatusPill tone={photo.suitable ? "info" : "warn"}>
          {photo.suitable ? "Waiting for your yes" : "Kabsi has a note"}
        </StatusPill>
        {photo.suitability_note ? (
          <p className="mt-2 text-small text-text-2">{photo.suitability_note}</p>
        ) : null}
        <label className="mt-3 block text-small font-bold text-text-1">
          What it shows
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 h-11 w-full rounded-input border border-stroke bg-surface-2 px-3 text-body font-normal text-text-1"
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
            size="md"
            {...(primary
              ? ({ variant: "primary", "data-main-cta": true } as const)
              : ({ variant: "secondary" } as const))}
            loading={busy === "publish"}
            disabled={!!busy}
            onClick={() => void run("publish")}
          >
            {photo.suitable ? "Approve photo" : "Approve anyway"}
          </Button>
          <Button
            size="md"
            variant="quiet"
            loading={busy === "skip"}
            disabled={!!busy}
            onClick={() => void run("skip")}
          >
            Don't post
          </Button>
        </div>
        {err ? (
          <p className="mt-2 text-small font-semibold text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </li>
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
    <section className="space-y-3">
      {checking.length ? (
        <Panel>
          <p className="text-body text-text-1" role="status">
            Kabsi is checking {checking.length} {checking.length === 1 ? "photo" : "photos"}. This
            takes a minute.
          </p>
        </Panel>
      ) : null}
      {notes.length ? (
        <ul className="grid gap-2">
          {notes.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface-1 p-4 text-small"
            >
              <span className="min-w-0 flex-1 text-text-1">
                <span className="font-bold">
                  {p.kind === "video" ? "Video kept. " : "Not added. "}
                </span>
                {p.suitability_note}
              </span>
              <Button size="md" variant="quiet" onClick={() => void dismiss(p.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** A photo that left the ready list, with its task state (approved, sent to Google, on Google, did not go through). */
function SentTile({
  photo,
  url,
  task,
  approvesHere,
}: {
  photo: Photo;
  url: string | undefined;
  task: TaskItem | undefined;
  approvesHere: boolean;
}) {
  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest">
      <PhotoImage url={url} />
      <div className="p-4">
        <p className="text-small font-bold text-text-1">
          {CATEGORIES[photo.category ?? "ADDITIONAL"] ?? "Other"}
          {photo.source === "staff_link" ? (
            <span className="block font-normal text-text-2">From the team photo link</span>
          ) : null}
        </p>
        {approvesHere ? (
          <TaskBlock task={task} kind="photo" rowState={photo.state} className="mt-3" />
        ) : null}
      </div>
    </li>
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
    <Panel title="Cover and logo" id="cover">
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map(([cat, title, p]) => {
          const advice =
            p?.width && p.height ? roleIssue(cat as "COVER" | "LOGO", p.width, p.height) : null;
          return (
            <div key={cat} className="flex gap-3 rounded-inner border border-line p-3">
              <div className="w-24 shrink-0 overflow-hidden rounded-inner">
                <PhotoImage url={p ? urls[p.storage_path] : undefined} square />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-small font-bold text-text-1">{title}</p>
                <p className="mt-1 text-small text-text-2">
                  {p
                    ? p.state === "publishing"
                      ? "Sending to Google."
                      : (advice ?? "Sent to Google.")
                    : cat === "COVER"
                      ? "None yet. Choose Preferred cover photo on a ready photo. A wide photo works best."
                      : "None yet. Choose Logo on a ready photo. A square one works best."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-small text-text-2">
        Google decides which photo it shows first, so Kabsi calls these your preferred ones.
      </p>
    </Panel>
  );
}

// The team photo link (K-23): uploads only, no account, turned off at any time. Kabsi shows a new link once.
function TeamLink({ locationId }: { locationId: string }) {
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
    <Panel title="Let your team send photos" id="team-photos">
      <p className="text-body text-text-2">
        Share this link with your team. They send photos without an account, and you approve each
        one first.
      </p>
      {link ? (
        <div className="mt-4">
          <CopyField label="Team photo link" value={link} />
          <p className="mt-2 text-small text-text-2">
            Copy it now. Kabsi shows it only once; make a new one if you lose it.
          </p>
        </div>
      ) : active ? (
        <p className="mt-3 text-small text-text-1">
          A link is on.{" "}
          {status.data?.uploads
            ? `${status.data.uploads} ${status.data.uploads === 1 ? "photo" : "photos"} added through it.`
            : "Nothing added through it yet."}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="md" variant="secondary" loading={busy} onClick={() => void run(true)}>
          {active || link ? "Make a new link" : "Make a link"}
        </Button>
        {active || link ? (
          <Button size="md" variant="quiet" disabled={busy} onClick={() => void run(false)}>
            Turn the link off
          </Button>
        ) : null}
      </div>
      {err ? (
        <p className="mt-2 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </Panel>
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
    <div className={cn(shape, "grid w-full place-items-center bg-surface-2 text-text-3")}>
      <Camera className="size-8" strokeWidth={1.5} aria-hidden />
    </div>
  );
}
