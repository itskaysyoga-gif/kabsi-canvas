// The access recordings (docs/PHOTOS.md, Videos): Rashid's own phone and computer, edited by lane R on 26 Oct 2026.
// Cropped to the page; Google's logo, the account photo, the owner's email, the business's own logo (never any
// Arabic shown, R-61), its photos and phone blurred; a ring on every tap or click; silent.
// Play muted, inline, looping, with the poster; captions are HTML from the steps below (never burned into the video),
// timed to the edited video. The access steps component (brief section 16) shows the current step's line.
import { KABSI_GROUP_ID } from "@/lib/site";
import addVideo from "@/assets/video/add-kabsi-manager.mp4";
import addPoster from "@/assets/video/add-kabsi-manager-poster.webp";
import removeVideo from "@/assets/video/remove-kabsi-manager.mp4";
import removePoster from "@/assets/video/remove-kabsi-manager-poster.webp";
import desktopVideo from "@/assets/video/add-kabsi-desktop.mp4";
import desktopPoster from "@/assets/video/add-kabsi-desktop-poster.webp";

export type VideoStep = { at: number; line: string };
export type AccessVideo = {
  src: string;
  poster: string;
  w: number;
  h: number;
  seconds: number;
  label: string;
  steps: VideoStep[];
};

export const ADD_KABSI: AccessVideo = {
  src: addVideo,
  poster: addPoster,
  w: 600,
  h: 1102,
  seconds: 16.2,
  label: "A phone screen recording: adding Kabsi as a Manager on a Google Business Profile",
  steps: [
    { at: 0, line: "Search your business name on Google, then tap the menu." },
    { at: 1.2, line: "Tap Business Profile settings." },
    { at: 2.4, line: "Tap People and access." },
    { at: 3.7, line: "Tap Add." },
    { at: 5.1, line: `Paste ${KABSI_GROUP_ID}.` },
    { at: 9.2, line: "Choose Kabsi Clients and keep Manager." },
    { at: 11.1, line: "Tap Add. On some screens the button says Invite." },
    {
      at: 12.5,
      line: "Done. It shows as pending until a person at Kabsi accepts it, within one working day.",
    },
  ],
};

export const REMOVE_KABSI: AccessVideo = {
  src: removeVideo,
  poster: removePoster,
  w: 600,
  h: 1102,
  seconds: 9.4,
  label: "A phone screen recording: removing Kabsi from a Google Business Profile",
  steps: [
    { at: 0, line: "Search your business name on Google, then tap the menu." },
    { at: 1.2, line: "Tap Business Profile settings." },
    { at: 2.4, line: "Tap People and access." },
    { at: 3.4, line: "Tap Kabsi Clients." },
    { at: 5.0, line: "Tap Remove group." },
    { at: 6.8, line: "Tap Remove to confirm." },
    { at: 7.5, line: "Done. Kabsi can no longer see or change your profile." },
  ],
};

// The same steps on a computer (Google Search in a browser). Show it from 768 px wide, in a plain browser frame,
// with ADD_KABSI on phones. Recorded while Kabsi Clients was already a Manager, so the list before the add is
// blurred and the last screen shows Manager; a fresh recording replaces it later (docs/PHOTOS.md).
export const ADD_KABSI_DESKTOP: AccessVideo = {
  src: desktopVideo,
  poster: desktopPoster,
  w: 1280,
  h: 720,
  seconds: 14.9,
  label: "A computer screen recording: adding Kabsi as a Manager on a Google Business Profile",
  steps: [
    {
      at: 0,
      line: "Search your business name on Google while signed in, then click the three dots.",
    },
    { at: 1.4, line: "Click Business Profile settings." },
    { at: 2.5, line: "Click People and access." },
    { at: 4.6, line: "Click Add." },
    { at: 6.7, line: `Paste ${KABSI_GROUP_ID}.` },
    { at: 9.0, line: "Choose Kabsi Clients and keep Manager." },
    { at: 11.2, line: "Click Invite. On some screens it says Add." },
    { at: 12.2, line: "Done. Kabsi Clients shows as Pending, then as Manager once Kabsi accepts." },
  ],
};
