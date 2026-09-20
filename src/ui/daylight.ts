export interface DaylightBackground {
  top: string;
  bottom: string;
}

const SCENE_BACKGROUND: DaylightBackground = {
  top: "rgb(238 237 228)",
  bottom: "rgb(248 246 239)",
};

// The simulation is a compact time slice, so its sky stays visually stable
// throughout playback instead of implying an unrealistic day-night cycle.
export function daylightBackgroundForProgress(
  _progress: number,
): DaylightBackground {
  return SCENE_BACKGROUND;
}
