import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { WhatsappChannel } from "@/components/app/whatsapp-channel";
import {
  choice,
  emailOptions,
  groupedCategories,
  loadPrefs,
  savePref,
  type Channel,
  type Frequency,
} from "@/lib/notifications";

// What Kabsi tells you, and how (K-46, P0.4-09): for each kind of notice, when the email comes (at once, in the daily
// email, or off) and whether it shows in the bell on Home. What the law or your safety needs stays on. Each change is
// saved as soon as it is made.
export function NotificationChoices({ locationId }: { locationId: string }) {
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

  return (
    <section
      className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-8"
      aria-labelledby="choices"
    >
      <h2 id="choices" className="text-xl font-bold">
        What Kabsi tells you
      </h2>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        Choose how each kind of notice reaches you. Emails do not arrive between 22:00 and 08:00
        your time, except an urgent change to your profile. They wait until 08:00.
      </p>
      <WhatsappChannel />
      {prefs.isError ? (
        <p className="mt-4 text-kb-small text-kb-red" role="alert">
          We couldn't load your choices. Refresh and try again.
        </p>
      ) : null}
      {prefs.data
        ? groupedCategories().map((g) => (
            <div key={g.group} className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-kb-stone">
                {g.group}
              </h3>
              <ul className="mt-2 divide-y divide-kb-hairline">
                {g.items.map((c) => {
                  const email = choice(prefs.data, c.id, "email");
                  const inApp = choice(prefs.data, c.id, "in_app");
                  return (
                    <li key={c.id} className="py-4">
                      <p className="font-bold">{c.label}</p>
                      <p className="mt-0.5 text-sm leading-6 text-kb-stone">{c.description}</p>
                      <label className="mt-3 block text-sm font-medium" htmlFor={`email-${c.id}`}>
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
                        className="mt-1 h-[52px] w-full rounded-card border border-kb-hairline bg-kb-white px-4 text-base"
                      >
                        {emailOptions(c).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {c.inApp ? (
                        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                          <Checkbox
                            checked={inApp !== "off"}
                            onCheckedChange={(v) =>
                              save.mutate({
                                category: c.id,
                                channel: "in_app",
                                frequency: v === true ? "default" : "off",
                              })
                            }
                            className="size-5 rounded-md border-2 border-kb-black"
                            disabled={!c.switchable}
                          />
                          <span>Show in the bell on Home{c.switchable ? "" : " (always on)"}</span>
                        </label>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        : null}
      <p className="mt-4 min-h-6 text-sm" role="status">
        {err ? <span className="text-kb-red">{err}</span> : saved}
      </p>
    </section>
  );
}
