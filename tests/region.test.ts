import { afterEach, describe, expect, it, vi } from "vitest";
import { isLebanonTimeZone } from "../src/lib/region";

const stubZone = (timeZone: string) =>
  vi
    .spyOn(Intl, "DateTimeFormat")
    .mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone }) }) as unknown as Intl.DateTimeFormat,
    );

describe("isLebanonTimeZone", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is true for Asia/Beirut", () => {
    stubZone("Asia/Beirut");
    expect(isLebanonTimeZone()).toBe(true);
  });

  it("is false for other zones", () => {
    for (const zone of ["America/New_York", "Europe/Madrid", "Asia/Dubai", "UTC"]) {
      stubZone(zone);
      expect(isLebanonTimeZone()).toBe(false);
    }
  });

  it("is false when the browser cannot report a zone", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no Intl");
    });
    expect(isLebanonTimeZone()).toBe(false);
  });
});
