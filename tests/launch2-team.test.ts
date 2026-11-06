// Launch 2 part A (master plan 30.36 item 5): what the Team page shows at once, and the line when a save fails.
import { describe, expect, it } from "vitest";
import {
  PENDING,
  saveError,
  withInvite,
  withoutInvite,
  withoutMember,
  withPolicy,
  withRole,
  type Team,
} from "@/lib/team";

const team: Team = {
  members: [
    { user_id: "o", email: "owner@a.example", role: "owner", you: true },
    { user_id: "m", email: "sam@a.example", role: "manager", you: false },
  ],
  invites: [{ id: "i1", email: "lee@a.example", role: "staff", created_at: "", expires_at: "" }],
  policies: {
    review_reply: "owner",
    post: "owner",
    photo: "owner",
    hours: "owner",
    profile_change: "owner",
  },
};

describe("Team shows a change at once", () => {
  it("a role change, a removal and a cancelled invitation", () => {
    expect(withRole(team, "m", "staff").members[1].role).toBe("staff");
    expect(withoutMember(team, "m").members.map((m) => m.user_id)).toEqual(["o"]);
    expect(withoutInvite(team, "i1").invites).toEqual([]);
    expect(team.members[1].role).toBe("manager");
  });
  it("an invitation, once per address, marked as not saved yet", () => {
    const t = withInvite(withInvite(team, "kim@a.example", "manager"), "kim@a.example", "staff");
    const kim = t.invites.filter((i) => i.email === "kim@a.example");
    expect(kim).toHaveLength(1);
    expect(kim[0].role).toBe("staff");
    expect(kim[0].id.startsWith(PENDING)).toBe(true);
  });
  it("the approval choices, all or one", () => {
    expect(
      Object.values(
        withPolicy(team, ["post", "photo", "hours", "review_reply", "profile_change"], true)
          .policies,
      ),
    ).toEqual(Array(5).fill("owner_and_managers"));
    expect(withPolicy(team, ["post"], true).policies.post).toBe("owner_and_managers");
    expect(withPolicy(team, ["post"], true).policies.photo).toBe("owner");
  });
  it("a failed save says it went back, after a plain reason when there is one", () => {
    expect(saveError(new Error("This person is already on your team."))).toBe(
      "This person is already on your team. Couldn't save that. It is back as it was. Try again.",
    );
    expect(saveError(new Error("Something went wrong. Please try again."))).toBe(
      "Couldn't save that. It is back as it was. Try again.",
    );
    expect(saveError("x")).toBe("Couldn't save that. It is back as it was. Try again.");
  });
});
