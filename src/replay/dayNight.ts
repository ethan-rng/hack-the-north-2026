import type { SimSpec } from "@/sim/schema";
import { ticksPerDay } from "@/sim/state";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface DaylightStop {
  at: number;
  top: Rgb;
  bottom: Rgb;
}

// Muted, warm-neutral stops keep the map aligned with the existing paper-like UI.
const DAYLIGHT_STOPS: DaylightStop[] = [
  { at: 0, top: { r: 226, g: 215, b: 211 }, bottom: { r: 244, g: 235, b: 222 } },
  { at: 0.2, top: { r: 238, g: 237, b: 228 }, bottom: { r: 248, g: 246, b: 239 } },
  { at: 0.5, top: { r: 226, g: 230, b: 225 }, bottom: { r: 242, g: 239, b: 229 } },
  { at: 0.76, top: { r: 207, g: 198, b: 202 }, bottom: { r: 232, g: 215, b: 202 } },
  { at: 1, top: { r: 48, g: 53, b: 64 }, bottom: { r: 65, g: 65, b: 72 } },
];

export interface DaylightBackground {
  top: string;
  bottom: string;
}

export function daylightBackgroundAt(spec: SimSpec, tick: number): DaylightBackground {
  const dayLength = Math.max(1, ticksPerDay(spec));
  const tickInDay = ((tick % dayLength) + dayLength) % dayLength;
  const progress = dayLength === 1 ? 0 : tickInDay / (dayLength - 1);

  const nextIndex = DAYLIGHT_STOPS.findIndex((stop) => stop.at >= progress);
  if (nextIndex <= 0) {
    return colorsOf(DAYLIGHT_STOPS[0]);
  }

  const next = DAYLIGHT_STOPS[nextIndex];
  const previous = DAYLIGHT_STOPS[nextIndex - 1];
  const amount = (progress - previous.at) / (next.at - previous.at);

  return {
    top: rgbToCss(mixRgb(previous.top, next.top, amount)),
    bottom: rgbToCss(mixRgb(previous.bottom, next.bottom, amount)),
  };
}

function colorsOf(stop: DaylightStop): DaylightBackground {
  return {
    top: rgbToCss(stop.top),
    bottom: rgbToCss(stop.bottom),
  };
}

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  };
}

function rgbToCss(color: Rgb): string {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}
