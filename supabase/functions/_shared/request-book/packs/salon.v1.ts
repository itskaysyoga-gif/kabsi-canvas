// Pack: hair, barber, beauty and non-medical spa businesses (the first commercial focus, docs/kabsi-3/product-decision.md).
// Data only. The words an owner reads, the services and how they are spelled, the fields to read, example phrases.
import { assertValidPack, type Pack } from "./schema.ts";

export const salonV1: Pack = assertValidPack({
  id: "salon",
  version: 1,
  title: "Salon",
  kinds: ["appointment", "enquiry"],
  defaultKind: "appointment",
  words: {
    customer: { singular: "client", plural: "clients" },
    staffSide: "the salon",
    kinds: {
      appointment: { singular: "Appointment", plural: "Appointments" },
      enquiry: { singular: "Enquiry", plural: "Enquiries" },
    },
    status: {
      appointment: {
        requested: "Requested",
        attended: "Came in",
        no_show: "No show",
        cancelled: "Cancelled",
        voided: "Removed",
      },
      enquiry: {
        new: "New",
        contacted: "Contacted",
        converted: "Became an appointment",
        lost: "Lost",
        voided: "Removed",
      },
    },
  },
  services: [
    { key: "highlights", label: "Highlights", spellings: ["highlights", "highlight", "hilights", "highlites", "balayage", "foils"] },
    { key: "haircut", label: "Haircut", spellings: ["haircut", "hair cut", "cut", "trim", "trimming", "fringe trim"] },
    { key: "blow_dry", label: "Blow dry", spellings: ["blow dry", "blowdry", "blow out", "blowout", "brushing", "brush"] },
    { key: "colour", label: "Colour", spellings: ["colour", "color", "dye", "tint", "root touch up", "roots"] },
    { key: "treatment", label: "Hair treatment", spellings: ["keratin", "hair treatment", "deep conditioning", "protein treatment", "botox hair"] },
    { key: "beard", label: "Beard trim", spellings: ["beard", "beard trim", "shave", "line up", "lineup"] },
    { key: "manicure", label: "Manicure", spellings: ["manicure", "mani", "gel nails", "nails", "gel polish"] },
    { key: "pedicure", label: "Pedicure", spellings: ["pedicure", "pedi"] },
    { key: "facial", label: "Facial", spellings: ["facial", "face treatment", "cleanup", "clean up"] },
    { key: "waxing", label: "Waxing", spellings: ["wax", "waxing", "threading", "eyebrow threading"] },
    { key: "lashes", label: "Lashes", spellings: ["lashes", "lash lift", "lash extensions", "lash tint"] },
    { key: "brows", label: "Brows", spellings: ["brows", "eyebrows", "brow lamination", "brow tint"] },
    { key: "massage", label: "Massage", spellings: ["massage", "back massage", "relaxing massage"] },
  ],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "phone", label: "Phone", target: "phone", required: false },
    { key: "service", label: "Service", target: "summary", required: true },
    { key: "when", label: "When", target: "when", required: false },
    { key: "stylist", label: "With", target: "details", required: false },
  ],
  examples: [
    { text: "Book Sarah for highlights Thursday afternoon", kind: "appointment" },
    { text: "Sarah confirmed Thursday 3", kind: "appointment" },
    { text: "Layla trim tomorrow 11, 0501234567", kind: "appointment" },
    { text: "Dina asked about a keratin price", kind: "enquiry" },
    { text: "Maya manicure and pedicure Friday 2pm with Rana", kind: "appointment" },
    { text: "what appointments are still unconfirmed", kind: "appointment" },
  ],
});
