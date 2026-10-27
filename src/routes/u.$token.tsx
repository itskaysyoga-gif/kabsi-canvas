import { useEffect, useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, ImagePlus } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { ACCEPT, MAX_BYTES, MAX_FILES, fileType, linkBusiness, staffUpload } from "@/lib/photos";

// The staff upload link (P0.5-01, K-23): a member of staff adds photos for the owner to approve, without an account.
// The page can only upload; it shows nothing of the business but its name. The owner turns the link off on Photos.
export const Route = createFileRoute("/u/$token")({
  head: () => ({
    meta: [{ title: "Add photos | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: StaffUploadPage,
});

function StaffUploadPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<{ name: string } | { gone: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    linkBusiness(token)
      .then((r) => setState(r.ok ? { name: r.name } : { gone: r.message }))
      .catch(() => setState({ gone: "This link does not work." }));
  }, [token]);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setMsg("");
    let added = 0;
    let note = "";
    for (const file of files) {
      if (!fileType(file)) {
        note = "Use JPG, PNG, WebP or HEIC photos.";
        continue;
      }
      if (file.size > MAX_BYTES) {
        note = "A file over 20 MB was left out.";
        continue;
      }
      const problem = await staffUpload(token, file).catch(() => "That upload failed. Try again.");
      if (problem) {
        note = problem;
        if (problem.includes("turned off")) {
          setState({ gone: problem });
          break;
        }
      } else added++;
    }
    setMsg(
      [added ? `Thank you. ${added} ${added === 1 ? "photo was" : "photos were"} sent.` : "", note]
        .filter(Boolean)
        .join(" "),
    );
    setBusy(false);
  }

  if (!state)
    return (
      <ConfirmLayout>
        <p className="text-text-2">Opening…</p>
      </ConfirmLayout>
    );
  if ("gone" in state)
    return (
      <ConfirmLayout>
        <h1 className="font-display text-h3 leading-tight">This link is not on</h1>
        <p className="mt-3 text-text-2">{state.gone}</p>
      </ConfirmLayout>
    );
  return (
    <ConfirmLayout>
      <p className="text-small font-bold uppercase tracking-wider text-text-2">{state.name}</p>
      <h1 className="mt-1 font-display text-h3 leading-tight">Add photos</h1>
      <p className="mt-3 text-text-2">
        Real photos of the place, the team, the work and what you sell. The owner looks at each one
        before anything goes to Google. Kabsi removes location data from every photo.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: "Take a photo", camera: true },
          { label: "Choose photos", camera: false },
        ].map((b) => (
          <label
            key={b.label}
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line bg-surface-1 p-4 text-center font-bold hover:border-text-1"
          >
            {b.camera ? (
              <Camera className="size-6" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-6" aria-hidden="true" />
            )}
            {busy ? "Sending…" : b.label}
            <input
              type="file"
              accept={b.camera ? "image/*" : ACCEPT}
              multiple={!b.camera}
              {...(b.camera ? { capture: "environment" as const } : {})}
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onFiles(e)}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-small text-text-2">Up to 20 at a time, 20 MB each.</p>
      {msg ? (
        <p className="mt-4 text-small" role="status">
          {msg}
        </p>
      ) : null}
    </ConfirmLayout>
  );
}
