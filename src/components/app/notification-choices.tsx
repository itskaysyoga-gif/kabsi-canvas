import { useState } from "react";
import { ChoiceChips } from "@/components/kabsi/d3-account";
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
  type Pref,
} from "@/lib/notifications";
import { choiceFailedLine, withPref } from "@/lib/routine-delivery";

// What Kabsi tells you, and how (K-46, P0.4-09). Design 3's four switches on top (each one is the email choice of one stored
// category: on is the category's default, off is off), and behind "Choose how each one reaches you" every kind of notice
// with when its email comes (at once, in the daily email, or off). What the law or
// your safety needs stays on. Each change is saved as soon as it is made.

/** Design 3's switch labels, mapped onto the stored category keys (never renamed: the engine reads them). */
const SWITCHES: { id: string; label: string; description?: string }[] = [
  { id: "review_new", label: "New reviews" },
  {
    id: "profile_issue",
    label: "Changes to your Google profile",
    description: "Urgent changes, like your name, address or hours, always reach you.",
  },
  { id: "weekly_report", label: "Your weekly report every Monday" },
  { id: "trial", label: "Tips during your trial" },
];

/** Owner words for a category whose stored label is retired (the label lives in notify-categories.ts on the server). */
const SHOWN_LABEL: Record<string, string> = { weekly_report: "Your weekly report" };

function usePrefs(locationId: string) {
  const qc = useQueryClient();
  const key = ["notification-prefs", locationId];
  const prefs = useQuery({
    queryKey: key,
    queryFn: () => loadPrefs(locationId),
  });
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState("");
  // App 6: a change shows at once and is saved in the background; if the save fails the page goes back with one plain
  // line. Saves go one after another, and the truth is read back once the last one is done.
  const save = useMutation({
    mutationKey: ["notification-prefs-save", locationId],
    scope: { id: `notification-prefs-${locationId}` },
    mutationFn: (v: { category: string; channel: Channel; frequency: Frequency }) =>
      savePref(locationId, v.category, v.channel, v.frequency),
    onMutate: async (v) => {
      setErr("");
      setSaved("");
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<Pref[]>(key);
      qc.setQueryData<Pref[]>(key, withPref(before ?? [], v));
      return { before };
    },
    onSuccess: () => setSaved("Saved."),
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.before);
      setSaved("");
      setErr(choiceFailedLine());
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: ["notification-prefs-save", locationId] }) > 1) return;
      void qc.invalidateQueries({ queryKey: key });
    },
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

/** Every kind of notice, with its email timing. (App 2 took the bell off Home: WhatsApp and email tell owners.) */
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
              <h4 className="text-small font-bold text-text-2">{g.group}</h4>
              <ul className="mt-1 divide-y divide-line">
                {g.items.map((c) => {
                  const email = choice(prefs.data, c.id, "email");
                  return (
                    <li key={c.id} className="py-4">
                      <p className="text-body font-bold">{SHOWN_LABEL[c.id] ?? c.label}</p>
                      <p className="mt-0.5 text-small text-text-2">{c.description}</p>
                      <ChoiceChips
                        className="mt-3"
                        name={`email-${c.id}`}
                        legend="Email"
                        legendClassName="text-small font-bold text-text-2"
                        options={emailOptions(c)}
                        value={email}
                        onChange={(v) =>
                          save.mutate({
                            category: c.id,
                            channel: "email",
                            frequency: v as Frequency,
                          })
                        }
                      />
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
