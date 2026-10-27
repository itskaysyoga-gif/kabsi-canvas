import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as PageGlyph } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageIcon } from "@/components/shared/page-icon";
import { myLatestLocation } from "@/lib/onboarding";
import {
  cancelInvite,
  inviteMember,
  KIND_LABEL,
  loadTeam,
  myAccess,
  removeMember,
  ROLE_HINT,
  ROLE_LABEL,
  setMemberRole,
  setPolicy,
  type ApprovalKind,
  type Role,
} from "@/lib/team";

// Settings, Team (K-16): the owner invites by email, changes a role or removes someone, and chooses whether managers
// may approve each kind. The database enforces every right; this page only asks.
export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: TeamPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KINDS: ApprovalKind[] = ["review_reply", "post", "photo", "hours", "profile_change"];
const selectClass = "h-[52px] w-full rounded-card border border-line bg-surface-1 px-4 text-body";

function TeamPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const access = useQuery({
    queryKey: ["access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const isOwner = access.data?.role === "owner";
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-small font-bold uppercase tracking-wider text-text-2">Settings</p>
      <h1 className="mt-1 font-display text-h2 leading-none sm:text-5xl">Team</h1>
      {loc ? <p className="mt-2 text-text-2">{loc.name}</p> : null}
      {location.isLoading || access.isLoading ? <p className="mt-6 text-text-2">Loading…</p> : null}
      {loc && access.data && !isOwner ? (
        <p className="mt-6 leading-7 text-text-2">
          Only the owner can manage the team. You are{" "}
          {access.data.role === "manager" ? "a manager" : "a staff member"} of this business:{" "}
          {ROLE_HINT[access.data.role].toLowerCase()}
        </p>
      ) : null}
      {loc && isOwner ? <TeamManager locationId={loc.id} /> : null}
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
    </div>
  );
}

function TeamManager({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["team", locationId], queryFn: () => loadTeam(locationId) });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("manager");
  const [message, setMessage] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["team", locationId] });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onMutate: () => setMessage(""),
    onSuccess: () => refresh(),
    onError: (e: Error) => setMessage(e.message),
  });

  function invite(e: FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) return setMessage("Enter a valid email address.");
    act.mutate(async () => {
      await inviteMember(locationId, address, role);
      setEmail("");
      setMessage(`Invitation sent to ${address}.`);
    });
  }

  if (team.isError)
    return <p className="mt-6 text-bad">We couldn't load your team. Refresh the page.</p>;
  if (!team.data) return <p className="mt-6 text-text-2">Loading…</p>;
  const t = team.data;
  return (
    <>
      <section className="mt-8 rounded-panel bg-surface-1 p-6 shadow-rest" aria-labelledby="invite">
        <h2 id="invite" className="text-title font-bold">
          Invite someone
        </h2>
        <p className="mt-1 text-small leading-6 text-text-2">
          They get an email and join when they sign in with that address.
        </p>
        <form onSubmit={invite} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "manager" | "staff")}
              className={`mt-2 ${selectClass}`}
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <p className="mt-2 text-small leading-6 text-text-2">{ROLE_HINT[role]}</p>
          </div>
          <Button type="submit" disabled={act.isPending}>
            Send invitation
          </Button>
        </form>
        {message ? (
          <p className="mt-3 text-small" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section
        className="mt-6 rounded-panel bg-surface-1 p-6 shadow-rest"
        aria-labelledby="members"
      >
        <h2 id="members" className="text-title font-bold">
          People
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {t.members.map((m) => (
            <li key={m.user_id} className="py-4">
              <p className="break-all font-bold">
                {m.email}
                {m.you ? <span className="font-normal text-text-2"> (you)</span> : null}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Role of ${m.email}`}
                  value={m.role}
                  disabled={act.isPending}
                  onChange={(e) => {
                    // Read the choice now: the select is controlled, so React puts the old value back.
                    const next = e.target.value as Role;
                    act.mutate(() => setMemberRole(locationId, m.user_id, next));
                  }}
                  className="h-11 rounded-card border border-line bg-surface-1 px-3 text-body"
                >
                  {(["owner", "manager", "staff"] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                {!m.you ? (
                  <Button
                    size="compact"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => act.mutate(() => removeMember(locationId, m.user_id))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {t.invites.map((i) => (
            <li key={i.id} className="py-4">
              <p className="break-all font-bold">{i.email}</p>
              <p className="text-small text-text-2">
                Invited as {ROLE_LABEL[i.role].toLowerCase()}, not joined yet
              </p>
              <Button
                size="compact"
                variant="ghost"
                className="mt-2"
                disabled={act.isPending}
                onClick={() => act.mutate(() => cancelInvite(i.id))}
              >
                Cancel invitation
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="mt-6 rounded-panel bg-surface-1 p-6 shadow-rest"
        aria-labelledby="approvals"
      >
        <h2 id="approvals" className="text-title font-bold">
          Who can approve
        </h2>
        <p className="mt-1 text-small leading-6 text-text-2">
          You approve everything. Turn one on to let managers approve it too. Changes to your
          business name, address, main category or open status, and reviews that need more care,
          always need you.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {KINDS.map((k) => {
            const p = t.policies[k];
            return (
              <li key={k} className="flex items-center justify-between gap-4 py-3">
                <Label htmlFor={`policy-${k}`} className="flex-1">
                  {KIND_LABEL[k]}
                  <span className="block text-small font-normal text-text-2">
                    {p === "owner_and_managers" ? "You and managers" : "Only you"}
                  </span>
                </Label>
                <Switch
                  id={`policy-${k}`}
                  checked={p === "owner_and_managers"}
                  disabled={act.isPending}
                  onCheckedChange={(on) => act.mutate(() => setPolicy(locationId, k, on))}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
