// P0.5-01: the photo screen's checks match the photo engine's, and file types are read the same way.
import { describe, expect, it } from "vitest";
import { fileType, roleIssue } from "@/lib/photos";
import { roleIssue as serverRoleIssue } from "../supabase/functions/_shared/photos/quality";

describe("cover and logo advice", () => {
  it("is the same in the app and in the photo engine", () => {
    const sizes: [number, number][] = [
      [1920, 1080],
      [1000, 1000],
      [800, 450],
      [3000, 1000],
      [720, 720],
      [200, 200],
      [720, 500],
    ];
    for (const role of ["COVER", "LOGO"] as const)
      for (const [w, h] of sizes) expect(roleIssue(role, w, h)).toBe(serverRoleIssue(role, w, h));
  });
});

describe("file types", () => {
  it("reads HEIC by its name when the browser leaves the type blank, and refuses a GIF", () => {
    expect(fileType({ type: "", name: "IMG_0001.HEIC" })).toBe("image/heic");
    expect(fileType({ type: "image/jpeg", name: "x.jpg" })).toBe("image/jpeg");
    expect(fileType({ type: "image/gif", name: "x.gif" })).toBeNull();
    expect(fileType({ type: "", name: "notes.pdf" })).toBeNull();
  });
});
