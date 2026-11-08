// Pack: gyms and studios. Used to prove the architecture with enquiries (a trial, a tour, a price question); not a launch focus.
// Data only.
import { assertValidPack, type Pack } from "./schema.ts";

export const gymV1: Pack = assertValidPack({
  id: "gym",
  version: 1,
  title: "Gym",
  kinds: ["enquiry", "appointment"],
  defaultKind: "enquiry",
  words: {
    customer: { singular: "member", plural: "members" },
    staffSide: "the gym",
    kinds: {
      enquiry: { singular: "Enquiry", plural: "Enquiries" },
      appointment: { singular: "Visit", plural: "Visits" },
    },
    status: {
      enquiry: {
        new: "Not contacted",
        contacted: "Contacted",
        converted: "Became a visit",
        lost: "Not joining",
        voided: "Removed",
      },
      appointment: {
        requested: "Requested",
        attended: "Came in",
        no_show: "Did not come",
        cancelled: "Cancelled",
        voided: "Removed",
      },
    },
  },
  services: [
    { key: "trial", label: "Trial", spellings: ["trial", "free trial", "trial session", "trial class", "taster", "try out"] },
    { key: "tour", label: "Tour", spellings: ["tour", "visit", "look around", "show me around"] },
    { key: "membership", label: "Membership", spellings: ["membership", "member", "join", "joining", "sign up", "signup", "monthly", "annual"] },
    { key: "personal_training", label: "Personal training", spellings: ["personal training", "pt", "personal trainer", "one to one", "1 to 1"] },
    { key: "class", label: "Class", spellings: ["class", "classes", "yoga", "pilates", "spin", "spinning", "boxing", "hiit", "zumba"] },
    { key: "price", label: "Price question", spellings: ["price", "prices", "cost", "how much", "rates", "fees"] },
    { key: "freeze", label: "Freeze or cancel", spellings: ["freeze", "pause membership", "cancel membership", "stop membership"] },
  ],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "phone", label: "Phone", target: "phone", required: false },
    { key: "interest", label: "Asked about", target: "summary", required: true },
    { key: "when", label: "When", target: "when", required: false },
    { key: "goal", label: "Goal", target: "details", required: false },
  ],
  examples: [
    { text: "Maya asked about a trial", kind: "enquiry" },
    { text: "who asked about a trial this week", kind: "enquiry" },
    { text: "Maya booked a trial Monday 6", kind: "appointment" },
    { text: "Omar wants personal training prices, 0521234567", kind: "enquiry" },
    { text: "Hana joining next month, pilates", kind: "enquiry" },
    { text: "Sam tour tomorrow 5pm", kind: "appointment" },
  ],
});
