import { useState, type ChangeEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, ShieldCheck } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { CopyField } from "@/components/kabsi/d2-parts";
import { ShortParas, AccountTop, ChoiceChips, Panel } from "@/components/kabsi/d3-account";
import {
  OpensLater,
  TaskBlock,
  UndoBar,
  useFirstTaskDone,
} from "@/components/kabsi/d3-content-task";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  StatusPill,
  WhatsAppLink,
} from "@/components/kabsi/ui";
import { SendReviewLink } from "@/components/shared/send-review-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { myLatestLocation } from "@/lib/onboarding";
import { usePlaceLink } from "@/lib/place-link";
import { contentCall } from "@/lib/reviews";
import { WHATSAPP_ON } from "@/lib/site";
import { latestByTarget, recentTasks, type TaskItem } from "@/lib/task-feed";
import { failedNext } from "@/lib/task-state";
import { myAccess } from "@/lib/team";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import {
  ACCEPT,
  CATEGORIES,
  CATEGORY_HELP,
  createLink,
  fullPhotoUrl,
  KINDS,
  linkStatus,
  loadPhotos,
  revokeLink,
  ROLES,
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

const SENT = ["publishing", "posted", "failed", "removing", "removed"];
// App 3: photo tiles share one size, in a grid that uses the width (two on a phone, four on a computer).
const TILE_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";
const TILE =
  "flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest";

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
    queryFn: () =>
      recentTasks(loc!.id, { kinds: ["photo", "photo_removal"], days: 120, limit: 100 }),
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
  const tasks = latestByTarget((feed.data ?? []).filter((t) => t.kind === "photo"));
  const removals = latestByTarget((feed.data ?? []).filter((t) => t.kind === "photo_removal"));
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
                  <div className="mt-1">
                    <ShortParas
                      className="text-body text-text-2"
                      text={
                        WHATSAPP_ON && role !== "staff"
                          ? "Send a photo to Kabsi. It checks the size and light, gets it ready and asks for your yes before it goes on Google. On Essentials and Pro."
                          : role === "staff"
                            ? "Add real photos of your place, your team, your work and what you sell. Kabsi checks each one, and the owner approves it."
                            : "Add real photos of your place, your team, your work and what you sell. Kabsi checks each one before you approve it."
                      }
                    />
                  </div>
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
                  Up to 20 at a time, 20 MB each. JPG, PNG, WebP or HEIC.
                </p>
                <p className="col-span-2 -mt-2 text-small text-text-2">
                  Videos are kept for 30 days; sending videos to Google comes later.
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
              <ul className={cn("mt-4", TILE_GRID)}>
                {sent.map((p) => (
                  <SentTile
                    key={p.id}
                    photo={p}
                    url={urls[p.id]}
                    task={tasks.get(p.id)}
                    removal={removals.get(p.id)}
                    approvesHere={approvesHere}
                    onChanged={refresh}
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

// The batch (K-23): with several ready photos, "3 photos are ready" and Approve all above the cards; then one wide card
// per photo (App 3: the photo on the left at its own shape, the choices and the buttons on the right; stacked on a phone).
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
  const many = ready.length > 1;
  return (
    <section className="space-y-4" aria-labelledby="ready-photos">
      {many ? (
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2 id="ready-photos" className="font-display text-h3 font-bold">
              {ready.length} photos are ready
            </h2>
            <p className="mt-1 text-body text-text-2">
              {clean.length === ready.length
                ? "Kabsi checked them and removed the location data."
                : `Kabsi has a note on ${ready.length - clean.length} of them. Look at those one by one below.`}
            </p>
          </div>
          {batch ? (
            <Button
              size="md"
              data-main-cta
              className="w-full shrink-0 sm:w-auto"
              loading={busy}
              onClick={() => void approveAll()}
            >
              {clean.length === ready.length
                ? "Approve all"
                : `Approve the ${clean.length} without a note`}
            </Button>
          ) : null}
        </div>
      ) : null}
      {done ? (
        <p className="text-small text-text-1" role="status">
          {done}
        </p>
      ) : null}
      {err ? (
        <p className="text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
      <ul className="space-y-4">
        {ready.map((p, i) => (
          <ReadyCard
            key={p.id}
            photo={p}
            url={urls[p.id]}
            heading={many ? `Photo ${i + 1} of ${ready.length}` : "1 photo is ready"}
            headingId={many ? undefined : "ready-photos"}
            primary={!batch && i === ready.findIndex((x) => x.suitable)}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: CATEGORIES[k] ?? k }));
const ROLE_OPTIONS = ROLES.map((k) => ({ value: k, label: CATEGORIES[k] ?? k }));

function ReadyCard({
  photo,
  url,
  heading,
  headingId,
  primary,
  onChanged,
}: {
  photo: Photo;
  url: string | undefined;
  heading: string;
  headingId?: string | undefined;
  primary: boolean;
  onChanged: () => unknown;
}) {
  // Photos 2: nothing is chosen for the owner; a kind they chose before (on WhatsApp) stays chosen.
  const [category, setCategory] = useState<string | null>(photo.category);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const isRole = category === "COVER" || category === "LOGO";
  const advice =
    isRole && photo.width && photo.height ? roleIssue(category, photo.width, photo.height) : null;
  async function run(kind: "publish" | "skip") {
    if (kind === "publish" && !category) {
      setErr("Choose what the photo shows first.");
      return;
    }
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
  function choose(v: string) {
    setCategory(v);
    setErr("");
  }
  // One help line, for the chosen chip (or the short prompt before one is chosen), never inside every chip.
  const kindHelp = !category
    ? "Choose what the photo shows first."
    : isRole
      ? null
      : CATEGORY_HELP[category];
  const roleHelp = isRole ? [CATEGORY_HELP[category], advice].filter(Boolean).join(" ") : null;
  const id = headingId ?? `photo-${photo.id}`;
  return (
    <li
      aria-labelledby={id}
      className="overflow-hidden rounded-panel border border-line bg-surface-1 shadow-rest md:grid md:grid-cols-[2fr_3fr]"
    >
      <div className="bg-surface-2 p-3 sm:p-4">
        <PhotoImage url={url} photo={photo} natural />
      </div>
      <div className="p-5 sm:p-6">
        <h3 id={id} className="font-display text-h3 font-bold">
          {heading}
        </h3>
        {photo.suitable ? (
          <p className="mt-1 text-body text-text-2">
            Kabsi checked it and removed the location data.
          </p>
        ) : (
          <div className="mt-2">
            <StatusPill tone="warn">Kabsi has a note</StatusPill>
            {photo.suitability_note ? (
              <p className="mt-2 text-body text-text-2">{photo.suitability_note}</p>
            ) : null}
          </div>
        )}
        <ChoiceChips
          className="mt-5"
          name={`kind-${photo.id}`}
          legend="What it shows"
          options={KIND_OPTIONS}
          value={category}
          onChange={choose}
          help={kindHelp}
        />
        <div className="mt-5 border-t border-line pt-4">
          <ChoiceChips
            name={`kind-${photo.id}`}
            legend="Use as"
            options={ROLE_OPTIONS}
            value={category}
            onChange={choose}
            help={roleHelp}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="md"
            {...(primary
              ? ({ variant: "primary", "data-main-cta": true } as const)
              : ({ variant: "secondary" } as const))}
            aria-disabled={!category || undefined}
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
          <p className="mt-3 text-small font-semibold text-bad" role="alert">
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
        <ul className={TILE_GRID} aria-label="Photos being checked">
          {checking.map((p) => (
            <li key={p.id} className={TILE}>
              <PhotoImage url={undefined} photo={p} />
              <p className="p-3 text-small text-text-1 sm:p-4" role="status">
                Checking your photo. About a minute.
              </p>
            </li>
          ))}
        </ul>
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

/** A photo that left the ready list, with its task state (approved, sent to Google, on Google, did not go through). Photos 2:
 * a photo Kabsi put on Google can be removed from Google, with one confirmation and the 10 second undo. */
function SentTile({
  photo,
  url,
  task,
  removal,
  approvesHere,
  onChanged,
}: {
  photo: Photo;
  url: string | undefined;
  task: TaskItem | undefined;
  removal: TaskItem | undefined;
  approvesHere: boolean;
  onChanged: () => unknown;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState<{ publication: string; until: number } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoErr, setUndoErr] = useState("");
  async function remove() {
    setBusy(true);
    setErr("");
    try {
      const r = await contentCall<{ publication: string; publish_after: string | null }>({
        do: "photo_remove",
        photo_id: photo.id,
      });
      setConfirm(false);
      setPending({
        publication: r.publication,
        until: r.publish_after ? Date.parse(r.publish_after) : Date.now(),
      });
      onChanged();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  async function undo() {
    if (!pending) return;
    setUndoBusy(true);
    setUndoErr("");
    try {
      await contentCall({
        do: "photo_undo",
        photo_id: photo.id,
        publication_id: pending.publication,
      });
      setPending(null);
      onChanged();
    } catch (x) {
      setUndoErr(
        x instanceof Error ? x.message : "Couldn't undo. Check your connection and try again.",
      );
    }
    setUndoBusy(false);
  }
  const counting = pending && pending.until > Date.now();
  // The removal's own state: Removing, Removed from Google, or Did not go through (the photo is still on Google).
  const removalFailed = photo.state === "posted" && removal?.owner === "failed" && !pending;
  return (
    <li className={TILE}>
      <PhotoImage url={url} photo={photo} />
      <div className="flex-1 p-3 sm:p-4">
        <p className="text-small font-bold text-text-1">
          {CATEGORIES[photo.category ?? "ADDITIONAL"] ?? "Other"}
          {photo.source === "staff_link" ? (
            <span className="block font-normal text-text-2">From the team photo link</span>
          ) : null}
        </p>
        {!approvesHere ? null : photo.state === "removing" || photo.state === "removed" ? (
          pending && counting ? (
            <UndoBar
              until={pending.until}
              busy={undoBusy}
              error={undoErr}
              onUndo={() => void undo()}
            />
          ) : (
            <div className="mt-3">
              <StatusPill tone={photo.state === "removed" ? "ok" : "info"}>
                {photo.state === "removed" ? "Removed from Google" : "Removing"}
              </StatusPill>
              <p className="mt-2 text-small text-text-2">
                {photo.state === "removed"
                  ? "Google no longer shows this photo."
                  : "Kabsi asked Google to remove it and checks until it is gone."}
              </p>
            </div>
          )
        ) : (
          <>
            {removalFailed ? (
              <div className="mt-3" role="alert">
                <StatusPill tone="bad">Did not go through</StatusPill>
                <p className="mt-2 text-small text-text-1">
                  {failedNext("photo_removal", removal.state)}
                </p>
              </div>
            ) : null}
            <TaskBlock
              task={task}
              kind="photo"
              rowState={photo.state}
              pill={false}
              className="mt-3"
            />
            {photo.state === "posted" ? (
              confirm ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-small text-text-1">
                    Remove this photo from your Google profile? You have 10 seconds to undo.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Button
                      size="md"
                      variant="secondary"
                      full
                      loading={busy}
                      onClick={() => void remove()}
                    >
                      Remove from Google
                    </Button>
                    <Button
                      size="md"
                      variant="quiet"
                      full
                      disabled={busy}
                      onClick={() => setConfirm(false)}
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="tertiary"
                  className="mt-2 whitespace-normal text-start"
                  onClick={() => setConfirm(true)}
                >
                  Remove from Google
                </Button>
              )
            ) : null}
          </>
        )}
        {err ? (
          <p className="mt-3 text-small font-semibold text-bad" role="alert">
            {err}
          </p>
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
                <PhotoImage url={p ? urls[p.id] : undefined} photo={p} square />
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

// Photos 2: the photo itself, fitted to its frame (never cropped, never a dark box): the small copy in the list, and the
// full file only when the owner taps it. A link that no longer loads shows the plain frame.
function PhotoImage({
  url,
  photo,
  square = false,
  natural = false,
}: {
  url: string | undefined;
  photo?: Photo | undefined;
  square?: boolean;
  /** App 3: the ready card shows the photo at its own shape, never boxed or cropped. */
  natural?: boolean;
}) {
  // The link that failed to load; a new link (signed again) is tried afresh.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = !!url && brokenUrl === url;
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const shape = square ? "aspect-square" : "aspect-[4/3]";
  if (!url || broken)
    return (
      <div
        className={cn(
          shape,
          "grid w-full place-items-center bg-surface-2 text-text-3",
          natural && "rounded-inner",
        )}
      >
        <Camera className="size-8" strokeWidth={1.5} aria-hidden />
      </div>
    );
  const label = photo ? `${CATEGORIES[photo.category ?? ""] ?? "Your"} photo` : "Your photo";
  async function openFull() {
    setOpen(true);
    setErr("");
    if (!photo || full) return;
    try {
      setFull(await fullPhotoUrl(photo.storage_path));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't open the photo. Try again.");
    }
  }
  const img = (
    <img
      src={url}
      alt={label}
      width={photo?.width ?? 800}
      height={photo?.height ?? 600}
      loading="lazy"
      decoding="async"
      onError={() => setBrokenUrl(url)}
      className={
        natural
          ? "mx-auto block h-auto max-h-[36rem] w-auto max-w-full rounded-inner"
          : square
            ? "size-full object-contain"
            : "size-full object-cover"
      }
    />
  );
  if (!photo || square) return <div className={cn(shape, "w-full bg-surface-2")}>{img}</div>;
  return (
    <>
      <button
        type="button"
        onClick={() => void openFull()}
        className={cn(
          !natural && shape,
          "block w-full rounded-inner bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-1",
        )}
        aria-label={`Open the ${label.toLowerCase()} full size`}
      >
        {img}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-large">
          <SheetHeader className="text-left">
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              {photo.state === "removed"
                ? "Google no longer shows this photo."
                : "The photo as Kabsi sends it to Google."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid place-items-center bg-surface-2">
            <img
              src={full ?? url}
              alt={label}
              width={photo.width ?? 800}
              height={photo.height ?? 600}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
          {err ? (
            <p className="mt-3 text-small font-semibold text-bad" role="alert">
              {err}
            </p>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
