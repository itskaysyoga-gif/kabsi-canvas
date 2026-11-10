// RB-T (master plan 30.50 item 8): a food pack for restaurants, cafes and bakeries, in test only. Table requests,
// catering and cake orders, and enquiries. Data only: it passes the one schema with no change to it, it is not in PACKS,
// so no business can switch it on, and the fourth-pack test and the extraction evaluation are its only readers.
import { assertValidPack, type Pack } from "../schema.ts";

export const foodV1: Pack = assertValidPack({
  id: "food",
  version: 1,
  title: "Restaurant, cafe or bakery",
  kinds: ["appointment", "job", "enquiry"],
  defaultKind: "appointment",
  words: {
    customer: { singular: "guest", plural: "guests" },
    staffSide: "the team",
    kinds: {
      appointment: { singular: "Table", plural: "Tables" },
      job: { singular: "Order", plural: "Orders" },
      enquiry: { singular: "Enquiry", plural: "Enquiries" },
    },
    status: {
      appointment: {
        requested: "Requested",
        attended: "Came in",
        no_show: "Did not come",
        cancelled: "Cancelled",
        voided: "Removed",
      },
      job: {
        waiting: "To make",
        active: "Being made",
        ready: "Ready",
        completed: "Collected",
        cancelled: "Cancelled",
        no_show: "Not collected",
        voided: "Removed",
      },
      enquiry: {
        new: "New",
        contacted: "Contacted",
        converted: "Became a table",
        lost: "Lost",
        voided: "Removed",
      },
    },
  },
  services: [
    { key: "table", label: "Table", spellings: ["table", "a table", "reservation", "reserve", "seats", "dinner", "lunch", "brunch", "breakfast"] },
    { key: "private_event", label: "Private event", spellings: ["private event", "private room", "private dining", "birthday dinner"] },
    { key: "cake", label: "Cake", spellings: ["cake", "birthday cake", "wedding cake", "chocolate cake", "cupcakes", "cupcake", "gateau"] },
    { key: "catering", label: "Catering", spellings: ["catering", "cater", "platters", "party platter", "buffet", "canapes"] },
    { key: "bread", label: "Bread and pastries", spellings: ["bread", "loaves", "sourdough", "croissants", "pastries", "manakish"] },
    { key: "takeaway", label: "Takeaway order", spellings: ["takeaway", "take away", "pickup order", "collection order"] },
    { key: "dietary", label: "Dietary question", spellings: ["allergy", "allergies", "gluten free", "vegan", "nut free", "halal", "dairy free"] },
    { key: "price", label: "Price question", spellings: ["price", "prices", "menu prices", "cost", "how much"] },
  ],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "phone", label: "Phone", target: "phone", required: false },
    { key: "request", label: "For", target: "summary", required: true },
    { key: "when", label: "When", target: "when", required: false },
    { key: "party_size", label: "Guests", target: "details", required: false },
    { key: "order_details", label: "Details", target: "details", required: false },
  ],
  // Bare hours a food business usually means as the afternoon or evening ("table at 8" is the evening; 8 is outside 1 to 7,
  // so it stays two readings). Data only.
  likely_pm_hours: [1, 2, 3, 4, 5, 6, 7],
  examples: [
    { text: "Table for 4 Friday 8pm, Sara", kind: "appointment" },
    { text: "Maya chocolate cake for Saturday 2pm, 0501234567", kind: "job" },
    { text: "Omar asked about catering for 30 people", kind: "enquiry" },
    { text: "Lina asked if the cake is gluten free", kind: "enquiry" },
    { text: "Rami wants the private room Thursday 7pm for 12", kind: "appointment" },
    { text: "3 ready", kind: "job" },
    { text: "what's open", kind: "appointment" },
  ],
});
