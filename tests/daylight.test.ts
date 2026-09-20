import { describe, expect, it } from "vitest";
import { daylightBackgroundForProgress } from "../src/ui/daylight";

describe("daylightBackgroundForProgress", () => {
  it("keeps the scene sky color constant throughout playback", () => {
    expect(daylightBackgroundForProgress(0)).toEqual({
      top: "rgb(238 237 228)",
      bottom: "rgb(248 246 239)",
    });
    expect(daylightBackgroundForProgress(0.5)).toEqual(
      daylightBackgroundForProgress(0),
    );
    expect(daylightBackgroundForProgress(1)).toEqual(
      daylightBackgroundForProgress(0),
    );
  });

  it("keeps the same sky for out-of-range progress too", () => {
    expect(daylightBackgroundForProgress(-1)).toEqual(
      daylightBackgroundForProgress(0),
    );
    expect(daylightBackgroundForProgress(2)).toEqual(
      daylightBackgroundForProgress(1),
    );
  });
});
