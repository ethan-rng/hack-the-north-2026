import { describe, expect, it } from "vitest";
import { daylightBackgroundForProgress } from "../src/ui/daylight";

describe("daylightBackgroundForProgress", () => {
  it("moves through muted sunrise, daytime, sunset, and night colors", () => {
    expect(daylightBackgroundForProgress(0)).toEqual({
      top: "rgb(226 215 211)",
      bottom: "rgb(244 235 222)",
    });
    expect(daylightBackgroundForProgress(0.5)).toEqual({
      top: "rgb(226 230 225)",
      bottom: "rgb(242 239 229)",
    });
    expect(daylightBackgroundForProgress(1)).toEqual({
      top: "rgb(48 53 64)",
      bottom: "rgb(65 65 72)",
    });
  });

  it("clamps progress outside the simulation range", () => {
    expect(daylightBackgroundForProgress(-1)).toEqual(
      daylightBackgroundForProgress(0),
    );
    expect(daylightBackgroundForProgress(2)).toEqual(
      daylightBackgroundForProgress(1),
    );
  });
});
