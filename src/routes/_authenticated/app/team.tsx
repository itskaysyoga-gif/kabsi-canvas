import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, UserPlus } from "lucide-react";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { HeldBack, useFirstTaskDone } from "@/components/kabsi/d3-settings-parts";
import { Button, ErrorState, Field, Segmented, Switch, buttonClass } from "@/components/kabsi/ui";
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
  type Team,
} from "@/lib/team";

// Team (K-16; UX 1, Design 3): the owner invites by email, changes a role or removes someone, and chooses who approves:
// "Only me" or "Me and managers" for everything at once, or each kind on its own. The database enforces every right; this
// page only asks. Held back until the first task is done (V4).
export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: TeamPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KINDS: ApprovalKind[] = ["review_reply", "post", "photo", "hours", "profile_change"];
const selectClass =
  "h-13 w-full rounded-input border border-stroke bg-surface-2 px-4 text-body text-text-1";

function TeamPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const open = useFirstTaskDone(loc?.id);
  const access = useQuery({
    queryKey: ["access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const isOwner = access.data?.role === "owner";
  return (
    <>
      <AccountTop title="Team" />
      {location.isLoading || access.isLoading ? (
        <p className="text-body text-text-2" role="status">
          Loading...
        </p>
      ) : null}
      {loc && access.data && !isOwner ? (
        <Panel>
          <p className="text-body text-text-2">
            Only the owner can manage the team. You are{" "}
            {access.data.role === "manager" ? "a manager" : "a staff member"} of this business:{" "}
            {ROLE_HINT[access.data.role].toLowerCase()}
          </p>
        </Panel>
      ) : null}
      {loc && isOwner && open === false ? (
        <Panel>
          <HeldBack />
        </Panel>
      ) : null}
      {loc && isOwner && open ? <TeamManager locationId={loc.id} /> : null}
      {!location.isLoading && !loc ? (
        <Link to="/start" className={buttonClass()} data-main-cta>
          Add your business
        </Link>
      ) : null}
    </>
  );
}

function rule(t: Team): "owner" | "managers" | "custom" {
  const ps = KINDS.map((k) => t.policies[k]);
  if (ps.every((p) => p === "owner_and_managers")) return "managers";
  if (ps.every((p) => p !== "owner_and_managers")) return "owner";
  return "custom";
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
    return (
      <ErrorState title="Your team did not load." onRetry={() => void team.refetch()}>
        Nothing you did, and nothing changed on Google. Try again in a minute.
      </ErrorState>
    );
  if (!team.data)
    return (
      <p className="text-body text-text-2" role="status">
        Loading...
      </p>
    );
  const t = team.data;
  const current = rule(t);
  return (
    <div className="space-y-4">
      <Panel>
        <ul className="divide-y divide-line">
          {t.members.map((m) => (
            <li
              key={m.user_id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-display font-bold uppercase"
              >
                {m.email[0]}
              </span>
              <p className="min-w-0 break-words text-body font-semibold">
                {m.email}
                {m.you ? <span className="font-normal text-text-2"> (you)</span> : null}
              </p>
              <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">
                <select
                  aria-label={`Role of ${m.email}`}
                  value={m.role}
                  disabled={act.isPending}
                  onChange={(e) => {
                    // Read the choice now: the select is controlled, so React puts the old value back.
                    const next = e.target.value as Role;
                    act.mutate(() => setMemberRole(locationId, m.user_id, next));
                  }}
                  className="h-11 rounded-full border border-line-strong bg-surface-1 px-3 text-small font-bold"
                >
                  {(["owner", "manager", "staff"] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                {!m.you ? (
                  <Button
                    size="md"
                    variant="quiet"
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
            <li
              key={i.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-line-strong font-display font-bold uppercase text-text-2"
              >
                {i.email[0]}
              </span>
              <div className="min-w-0">
                <p className="break-words text-body font-semibold">{i.email}</p>
                <p className="text-small text-text-2">
                  Invited as {ROLE_LABEL[i.role].toLowerCase()}, not joined yet
                </p>
              </div>
              <Button
                size="md"
                variant="tertiary"
                className="col-start-2 justify-self-start sm:col-start-3"
                disabled={act.isPending}
                onClick={() => act.mutate(() => cancelInvite(i.id))}
              >
                Cancel invitation
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Invite someone" id="invite">
        <p className="text-small text-text-2">
          They get an email and join when they sign in with that address.
        </p>
        <form onSubmit={invite} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="invite-email"
            label="Email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <label htmlFor="invite-role" className="mb-2 block text-small font-bold">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "manager" | "staff")}
              className={selectClass}
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <p className="text-small text-text-2 sm:col-span-2">{ROLE_HINT[role]}</p>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              size="md"
              loading={act.isPending}
              icon={<UserPlus className="size-4" aria-hidden />}
              data-main-cta
            >
              Send invitation
            </Button>
          </div>
        </form>
        {message ? (
          <p className="mt-3 text-small" role="status">
            {message}
          </p>
        ) : null}
      </Panel>

      <Panel title="Approvals" id="approvals">
        <p className="mb-3 text-body text-text-2">Who can approve replies and posts</p>
        <Segmented
          label="Who can approve replies and posts"
          value={current}
          onChange={(v) => {
            const on = v === "managers";
            act.mutate(async () => {
              for (const k of KINDS) {
                const managersToo = t.policies[k] === "owner_and_managers";
                if (managersToo !== on) await setPolicy(locationId, k, on);
              }
            });
          }}
          options={[
            { value: "owner", label: "Only me" },
            { value: "managers", label: "Me and managers" },
          ]}
        />
        <p className="mt-3 text-small text-text-2">
          Staff can send photos. They cannot approve anything.
        </p>
        <details className="group mt-4 border-t border-line pt-1" open={current === "custom"}>
          <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-small font-bold [&::-webkit-details-marker]:hidden">
            Choose for each kind
            <ChevronDown
              className="size-5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="text-small text-text-2">
            You approve everything. Turn one on to let managers approve it too. Changes to your
            business name, address, main category or open status, and reviews that need more care,
            always need you.
          </p>
          <div className="mt-4 space-y-4">
            {KINDS.map((k) => {
              const p = t.policies[k];
              return (
                <Switch
                  key={k}
                  label={KIND_LABEL[k]}
                  description={p === "owner_and_managers" ? "You and managers" : "Only you"}
                  checked={p === "owner_and_managers"}
                  disabled={act.isPending}
                  onChange={(on) => act.mutate(() => setPolicy(locationId, k, on))}
                />
              );
            })}
          </div>
        </details>
      </Panel>
    </div>
  );
}
