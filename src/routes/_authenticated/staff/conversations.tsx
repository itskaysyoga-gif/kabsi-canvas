import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { PanelChips, StaffTop, usePanelChips } from "@/components/staff/staff-ui";
import { ChatsPanel } from "@/components/staff/chats-panel";
import { FollowupsPanel } from "@/components/staff/followups-panel";
import { ConciergePanel } from "@/components/staff/concierge-panel";

export const Route = createFileRoute("/_authenticated/staff/conversations")({
  head: () => ({
    meta: [{ title: "Conversations | Staff | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: Conversations,
});

const IDS = ["chats", "followups", "concierge"] as const;

function Conversations() {
  const p = usePanelChips(IDS);
  return (
    <>
      <StaffTop page={STAFF_PAGES.conversations} />
      <PanelChips
        value={p.show}
        onChange={p.set}
        options={[
          { value: "chats", label: "Chats with Nora" },
          { value: "followups", label: "Follow-ups" },
          { value: "concierge", label: "Concierge" },
        ]}
      />
      <div className="space-y-5">
        {p.on("chats") ? (
          <div id="chats" className="scroll-mt-24">
            <ChatsPanel />
          </div>
        ) : null}
        {p.on("followups") ? (
          <div id="followups" className="scroll-mt-24">
            <FollowupsPanel />
          </div>
        ) : null}
        {p.on("concierge") ? (
          <div id="concierge" className="scroll-mt-24">
            <ConciergePanel />
          </div>
        ) : null}
      </div>
    </>
  );
}
