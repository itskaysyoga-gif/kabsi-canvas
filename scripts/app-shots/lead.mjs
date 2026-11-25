// scripts/app-shots fixtures for the free check (UX 1, the waiting list while the nearby check is closed).
const place = {
  place_id: "ChIJmaplestreetsalon000001",
  name: "Maple Street Salon",
  address: "12 Maple Street, Portland, Oregon, United States",
};
export const tables = {};
export const rpc = {};
export const functions = {
  "profile-snapshot": (c) =>
    c.body?.action === "search"
      ? { places: [place] }
      : c.body?.action === "check"
        ? {
            snapshot: {
              ...place,
              category: "Hair salon",
              rating: 4.6,
              review_count: 38,
              business_status: "OPERATIONAL",
              open_now: true,
              hours: ["Monday: 10:00 to 21:00"],
              phone: "+971 4 000 0000",
              website: null,
              has_photos: true,
              photo_count: 12,
              flags: [
                {
                  tone: "warning",
                  title: "No website on your Google profile",
                  detail: "Add your website or booking link.",
                },
              ],
              checklist: [],
              cached: false,
            },
          }
        : { ok: true },
  "POST visibility/check": { state: "waitlist" },
  "POST visibility/waitlist": { ok: true },
};
