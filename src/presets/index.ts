import type { SimSpec } from "@/sim/schema";
import { cafeSpec } from "./cafe";
import { barbershopSpec } from "./barbershop";
import { tacoshopSpec } from "./tacoshop";

export const PRESETS: Record<string, SimSpec> = {
  cafe: cafeSpec,
  barbershop: barbershopSpec,
  tacoshop: tacoshopSpec,
};

export function getPreset(id: string): SimSpec | undefined {
  return PRESETS[id];
}
