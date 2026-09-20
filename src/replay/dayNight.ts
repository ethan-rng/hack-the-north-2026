import type { SimSpec } from "@/sim/schema";
import { ticksPerDay } from "@/sim/state";
import {
  daylightBackgroundForProgress,
  type DaylightBackground,
} from "@/ui/daylight";

export {
  daylightBackgroundForProgress,
  type DaylightBackground,
} from "@/ui/daylight";

export function daylightBackgroundAt(
  spec: SimSpec,
  tick: number,
): DaylightBackground {
  const dayLength = Math.max(1, ticksPerDay(spec));
  const tickInDay = ((tick % dayLength) + dayLength) % dayLength;
  const progress = dayLength === 1 ? 0 : tickInDay / (dayLength - 1);

  return daylightBackgroundForProgress(progress);
}
