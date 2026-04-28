/**
 * Structured specs transcribed from Owner's Manual page 7 (Specifications).
 * Used for high-precision answers; RAG still handles narrative/setup content.
 */

export interface DutyEntry {
  voltage: "120V" | "240V";
  percent: number;
  amps: number;
}

export interface ProcessSpecs {
  duty_cycles: DutyEntry[];
  welding_current_range_amps: { min: number; max: number; voltage: "120V" | "240V" }[];
  current_input_at_output?: { amps_in: number; amps_out: number; voltage: "120V" | "240V" }[];
  max_ocv_vdc?: number;
  weldable_materials?: string[];
  wire_capacity_inches?: string[];
  wire_speed_ipm?: { min: number; max: number };
  wire_spool_capacity_lb?: number;
  notes?: string[];
}

const mig: ProcessSpecs = {
  duty_cycles: [
    { voltage: "120V", percent: 40, amps: 100 },
    { voltage: "120V", percent: 100, amps: 75 },
    { voltage: "240V", percent: 25, amps: 200 },
    { voltage: "240V", percent: 100, amps: 115 },
  ],
  welding_current_range_amps: [
    { voltage: "120V", min: 30, max: 140 },
    { voltage: "240V", min: 30, max: 220 },
  ],
  current_input_at_output: [
    { voltage: "120V", amps_in: 20.8, amps_out: 100 },
    { voltage: "240V", amps_in: 25.5, amps_out: 200 },
  ],
  max_ocv_vdc: 86,
  weldable_materials: [
    "Mild Steel",
    "Stainless Steel",
    "Aluminum (with optional Spool Gun)",
  ],
  wire_capacity_inches: [
    'Solid Core: 0.025" / 0.030" / 0.035"',
    'Flux Cored: 0.030" / 0.035" / 0.045"',
  ],
  wire_speed_ipm: { min: 50, max: 500 },
  wire_spool_capacity_lb: 12,
};

const tig: ProcessSpecs = {
  duty_cycles: [
    { voltage: "120V", percent: 40, amps: 125 },
    { voltage: "120V", percent: 100, amps: 90 },
    { voltage: "240V", percent: 30, amps: 175 },
    { voltage: "240V", percent: 100, amps: 105 },
  ],
  welding_current_range_amps: [
    { voltage: "120V", min: 10, max: 125 },
    { voltage: "240V", min: 10, max: 175 },
  ],
  current_input_at_output: [
    { voltage: "120V", amps_in: 20.6, amps_out: 125 },
    { voltage: "240V", amps_in: 15.6, amps_out: 175 },
  ],
  max_ocv_vdc: 86,
  weldable_materials: ["Mild Steel", "Stainless Steel", "Chrome Moly"],
};

const stick: ProcessSpecs = {
  duty_cycles: [
    { voltage: "120V", percent: 40, amps: 80 },
    { voltage: "120V", percent: 100, amps: 60 },
    { voltage: "240V", percent: 25, amps: 175 },
    { voltage: "240V", percent: 100, amps: 100 },
  ],
  welding_current_range_amps: [
    { voltage: "120V", min: 10, max: 80 },
    { voltage: "240V", min: 10, max: 175 },
  ],
  current_input_at_output: [
    { voltage: "120V", amps_in: 19.5, amps_out: 80 },
    { voltage: "240V", amps_in: 23.7, amps_out: 175 },
  ],
  max_ocv_vdc: 86,
  weldable_materials: ["Mild Steel", "Stainless Steel"],
};

const flux: ProcessSpecs = {
  notes: [
    "Flux-Cored wire welding is covered under the MIG / Flux-Cored section of the manual; duty cycle ratings for the power source are the same MIG table on page 7 (process selector uses MIG mode for synergic control).",
    "For porosity/spatter in flux-cored welds, use the troubleshooting matrices in Welding Tips (manual) and verify polarity, cleanliness, CTWD, and wire feed.",
  ],
  duty_cycles: mig.duty_cycles,
  welding_current_range_amps: mig.welding_current_range_amps,
  max_ocv_vdc: mig.max_ocv_vdc,
};

export function getSpecifications(
  process: string,
  specType?: string,
): Record<string, unknown> {
  const p = process.toLowerCase();
  const proc =
    p === "mig"
      ? mig
      : p === "tig"
        ? tig
        : p === "stick"
          ? stick
          : p === "flux-cored"
            ? flux
            : null;

  if (!proc) {
    return {
      mig,
      tig,
      stick,
      flux_cored: flux,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }

  if (!specType || specType === "all") {
    return { process, specs: proc, citation: "Owner's Manual — Specifications (page 7)" };
  }

  if (specType === "duty_cycle") {
    return {
      process,
      duty_cycles: proc.duty_cycles,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }
  if (specType === "amperage_range") {
    return {
      process,
      welding_current_range_amps: proc.welding_current_range_amps,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }
  if (specType === "voltage") {
    return {
      process,
      input_voltages: ["120 VAC / 60 Hz", "240 VAC / 60 Hz"],
      max_ocv_vdc: proc.max_ocv_vdc,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }
  if (specType === "wire_sizes") {
    return {
      process,
      wire_capacity_inches: proc.wire_capacity_inches ?? mig.wire_capacity_inches,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }
  if (specType === "weldable_materials") {
    return {
      process,
      weldable_materials: proc.weldable_materials,
      citation: "Owner's Manual — Specifications (page 7)",
    };
  }

  return { process, specs: proc, citation: "Owner's Manual — Specifications (page 7)" };
}
