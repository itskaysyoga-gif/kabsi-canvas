import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addTestReview, amStaff } from "@/lib/reviews";

// Staff only, and only for simulated locations (the RPC refuses anything else).
export function StaffTestTool({ locationId }: { locationId: string }) {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: 5 * 60_000 });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("Test customer");
  const [msg, setMsg] = useState("");
  if (!staff.data) return null;
  async function add() {
    setMsg("");
    try {
      await addTestReview(locationId, rating, comment, reviewer);
      setComment("");
      setMsg("Added. It appears here after the next sync (within 5 minutes).");
    } catch (e) {
      setMsg(
        e instanceof Error && e.message.includes("not_a_mock_location")
          ? "Only works on test (simulated) locations."
          : "Couldn't add it.",
      );
    }
  }
  return (
    <details className="mt-10 rounded-panel border border-dashed border-line p-5">
      <summary className="cursor-pointer text-small font-bold">Staff: add a test review</summary>
      <div className="mt-4 grid gap-3">
        <div className="flex gap-3">
          <Input
            aria-label="Reviewer name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
          <select
            aria-label="Rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-card border border-line bg-surface-1 px-3"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} of 5
              </option>
            ))}
          </select>
        </div>
        <Textarea
          dir="auto"
          aria-label="Review text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Review text, in any language"
        />
        <Button size="compact" variant="outline" onClick={() => void add()}>
          Add test review
        </Button>
        {msg ? <p className="text-small text-text-2">{msg}</p> : null}
      </div>
    </details>
  );
}
