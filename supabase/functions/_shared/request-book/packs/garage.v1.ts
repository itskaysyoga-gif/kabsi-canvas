// Pack: garages and trades that work on jobs (the next focus, or the fallback if the salon pilot does not pay).
// Data only. Vehicles and quotes are separate modules for later; here a car is a text detail on the request.
import { assertValidPack, type Pack } from "./schema.ts";

export const garageV1: Pack = assertValidPack({
  id: "garage",
  version: 1,
  title: "Garage",
  kinds: ["job", "enquiry"],
  defaultKind: "job",
  words: {
    customer: { singular: "customer", plural: "customers" },
    staffSide: "the garage",
    kinds: {
      job: { singular: "Job", plural: "Jobs" },
      enquiry: { singular: "Enquiry", plural: "Enquiries" },
    },
    status: {
      job: {
        waiting: "Waiting",
        active: "In the shop",
        ready: "Ready",
        completed: "Collected",
        cancelled: "Cancelled",
        no_show: "Did not come",
        voided: "Removed",
      },
      enquiry: {
        new: "New",
        contacted: "Contacted",
        converted: "Became a job",
        lost: "Lost",
        voided: "Removed",
      },
    },
  },
  services: [
    { key: "brakes", label: "Brakes", spellings: ["brakes", "brake", "brake pads", "pads", "squeaking brakes", "frem", "frein"] },
    { key: "oil_change", label: "Oil change", spellings: ["oil change", "oil", "oil and filter", "oil filter", "zeit", "service"] },
    { key: "tyres", label: "Tyres", spellings: ["tyres", "tyre", "tires", "tire", "puncture", "flat tyre", "flat tire", "wheel alignment", "alignment"] },
    { key: "battery", label: "Battery", spellings: ["battery", "batteries", "flat battery", "will not start", "wont start"] },
    { key: "air_con", label: "Air conditioning", spellings: ["air con", "aircon", "air conditioning", "ac", "a c", "no cold air"] },
    { key: "engine", label: "Engine", spellings: ["engine", "motor", "engine light", "check engine", "overheating"] },
    { key: "gearbox", label: "Gearbox", spellings: ["gearbox", "gear box", "gears", "transmission", "clutch"] },
    { key: "suspension", label: "Suspension", spellings: ["suspension", "shocks", "shock absorbers", "noise from the front"] },
    { key: "inspection", label: "Inspection", spellings: ["inspection", "check up", "checkup", "pre purchase check", "mot"] },
  ],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "phone", label: "Phone", target: "phone", required: false },
    { key: "problem", label: "Work needed", target: "summary", required: true },
    { key: "when", label: "When", target: "when", required: false },
    { key: "car", label: "Car", target: "details", required: false },
    { key: "registration", label: "Registration", target: "details", required: false },
  ],
  examples: [
    { text: "Ali Corolla 2016 brakes squeaking, 0501234567, tomorrow 10", kind: "job" },
    { text: "Ali's car is ready", kind: "job" },
    { text: "not Corolla, Civic", kind: "job" },
    { text: "Karim asked about a clutch price", kind: "enquiry" },
    { text: "Sam Golf oil and filter Friday morning", kind: "job" },
    { text: "42 collected", kind: "job" },
  ],
});
