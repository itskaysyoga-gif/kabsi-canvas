import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/kabsi/ui";
import {
  choice,
  emailOptions,
  groupedCategories,
  loadPrefs,
  savePref,
  type Channel,
  type Frequency,
} from "@/lib/notifications";

// What Kabsi tells you, and how (K-46, P0.4-09). Design 3's four switches on top (each one is the email choice of one stored
// category: on is the category's default, off is off), and behind "Choose how each one reaches you" every kind of notice
// with when its email comes (at once, in the daily email, or off) and whether it shows in the bell on Home. What the law or
// your safety needs stays on. Each change is saved as soon as it is made.

/** Design 3's switch labels, mapped onto the stored category keys (never renamed: the engine reads them). */
const SWITCHES: { id: string; label: string; description?: string }[] = [
  { id: "review_new", label: "New reviews" },
  {
    id: "profile_issue",
    label: "Changes to your Google profile",
    description: "Urgent changes, like your name, address or hours, always reach you.",
  },
  { id: "weekly_report", label: "Results Report every Monday" },
  { id: "trial", label: "Tips during your trial" },
];

/** Owner words for a category whose stored label is retired (the label lives in notify-categories.ts on the server). */
const SHOWN_LABEL: Record<string, string> = { weekly_report: "Results Report" };

function usePrefs(locationId: string) {
  const qc = useQueryClient();
  const prefs = useQuery({
    queryKey: ["notification-prefs", locationId],
    queryFn: () => loadPrefs(locationId),
  });
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState("");
  const save = useMutation({
    mutationFn: (v: { category: string; channel: Channel; frequency: Frequency }) =>
      savePref(locationId, v.category, v.channel, v.frequency),
    onMutate: () => {
      setErr("");
      setSaved("");
    },
    onSuccess: () => {
      setSaved("Saved.");
      void qc.invalidateQueries({ queryKey: ["notification-prefs", locationId] });
    },
    onError: () => setErr("Couldn't save. Please try again."),
  });
  return { prefs, save, err, saved };
}

function Saved({ err, saved }: { err: string; saved: string }) {
  return (
    <p className="mt-3 min-h-6 text-small" role="status">
      {err ? <span className="text-bad">{err}</span> : saved}
    </p>
  );
}

/** The four switches of Design 3's Settings. */
export function MessageSwitches({ locationId }: { locationId: string }) {
  const { prefs, save, err, saved } = usePrefs(locationId);
  if (prefs.isError)
    return (
      <p className="text-small text-bad" role="alert">
        We couldn&apos;t load your choices. Refresh and try again.
      </p>
    );
  if (!prefs.data) return null;
  return (
    <>
      <div className="space-y-4">
        {SWITCHES.map((s) => (
          <Switch
            key={s.id}
            label={s.label}
            description={s.description}
            checked={choice(prefs.data, s.id, "email") !== "off"}
            disabled={save.isPending}
            onChange={(on) =>
              save.mutate({ category: s.id, channel: "email", frequency: on ? "default" : "off" })
            }
          />
        ))}
      </div>
      <Saved err={err} saved={saved} />
    </>
  );
}

/** Every kind of notice, with its email timing and the bell on Home. */
export function NotificationChoices({ locationId }: { locationId: string }) {
  const { prefs, save, err, saved } = usePrefs(locationId);
  return (
    <div>
      <p className="text-small text-text-2">
        Choose how each kind of notice reaches you. Emails do not arrive between 22:00 and 08:00
        your time, except an urgent change to your profile. They wait until 08:00.
      </p>
      {prefs.isError ? (
        <p className="mt-4 text-small text-bad" role="alert">
          We couldn&apos;t load your choices. Refresh and try again.
        </p>
      ) : null}
      {prefs.data
        ? groupedCategories().map((g) => (
            <div key={g.group} className="mt-5">
              <h4 className="text-label font-bold text-text-2">{g.group}</h4>
              <ul className="mt-1 divide-y divide-line">
                {g.items.map((c) => {
                  const email = choice(prefs.data, c.id, "email");
                  const inApp = choice(prefs.data, c.id, "in_app");
                  return (
                    <li key={c.id} className="py-4">
                      <p className="text-body font-bold">{SHOWN_LABEL[c.id] ?? c.label}</p>
                      <p className="mt-0.5 text-small text-text-2">{c.description}</p>
                      <label
                        className="mt-3 block text-label font-bold text-text-2"
                        htmlFor={`email-${c.id}`}
                      >
                        Email
                      </label>
                      <select
                        id={`email-${c.id}`}
                        value={email}
                        onChange={(e) =>
                          save.mutate({
                            category: c.id,
                            channel: "email",
                            frequency: e.target.value as Frequency,
                          })
                        }
                        className="mt-1 h-12 w-full rounded-input border border-stroke bg-surface-1 px-3 text-body"
                      >
                        {emailOptions(c).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {c.inApp ? (
                        <div className="mt-3">
                          <Switch
                            label={`Show in the bell on Home${c.switchable ? "" : " (always on)"}`}
                            checked={inApp !== "off"}
                            disabled={!c.switchable || save.isPending}
                            onChange={(v) =>
                              save.mutate({
                                category: c.id,
                                channel: "in_app",
                                frequency: v ? "default" : "off",
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        : null}
      <Saved err={err} saved={saved} />
    </div>
  );
}
