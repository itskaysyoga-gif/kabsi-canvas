// A fourth pack, used only by tests, to prove that a new trade is a new data file and nothing else. It uses all three
// kinds with words no other pack uses. If this file ever needs a change to the schema, the workflow, the tools, the
// policy or the replies, the design has broken (docs/kabsi-3/build-decisions.md: "Kinds are data").
import { assertValidPack, type Pack } from "../schema.ts";

export const tutorV1: Pack = assertValidPack({
  id: "tutor",
  version: 1,
  title: "Tutoring studio",
  kinds: ["appointment", "enquiry", "job"],
  defaultKind: "appointment",
  words: {
    customer: { singular: "student", plural: "students" },
    staffSide: "the studio",
    kinds: {
      appointment: { singular: "Lesson", plural: "Lessons" },
      enquiry: { singular: "Question", plural: "Questions" },
      job: { singular: "Project", plural: "Projects" },
    },
    status: {
      appointment: { requested: "Pencilled in", attended: "Taught", no_show: "Absent", cancelled: "Called off", voided: "Removed" },
      enquiry: { new: "Unanswered", contacted: "Answered", converted: "Became a lesson", lost: "Dropped", voided: "Removed" },
      job: {
        waiting: "Not started", active: "Under way", ready: "Ready to hand in",
        completed: "Handed in", cancelled: "Called off", no_show: "Never started", voided: "Removed",
      },
    },
  },
  services: [
    { key: "maths", label: "Maths", spellings: ["maths", "math", "algebra", "calculus", "geometry"] },
    { key: "essay", label: "Essay help", spellings: ["essay", "essays", "writing", "coursework"] },
    { key: "exam", label: "Exam preparation", spellings: ["exam", "exams", "revision", "mock", "gcse", "sat"] },
  ],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "phone", label: "Phone", target: "phone", required: false },
    { key: "subject", label: "Subject", target: "summary", required: true },
    { key: "when", label: "When", target: "when", required: false },
    { key: "level", label: "Level", target: "details", required: false },
  ],
  examples: [
    { text: "Noor maths Tuesday 4pm", kind: "appointment" },
    { text: "Noor's essay is ready", kind: "job" },
    { text: "Jad asked about exam revision", kind: "enquiry" },
  ],
});
