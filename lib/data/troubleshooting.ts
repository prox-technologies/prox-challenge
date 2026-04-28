export interface TroubleEntry {
  symptom_keywords: string[];
  process?: ("mig" | "flux-cored" | "tig" | "stick")[];
  possible_causes: string[];
  solutions: string[];
  manual_pages: string;
}

/**
 * Condensed from Owner's Manual Welding Tips — porosity / spatter sections.
 */
const entries: TroubleEntry[] = [
  {
    symptom_keywords: ["porosity", "porous", "holes", "cavities", "voids"],
    process: ["mig", "flux-cored"],
    possible_causes: [
      "Incorrect polarity for the process",
      "Insufficient shielding gas (MIG solid wire)",
      "Incorrect shielding gas (MIG solid wire)",
      "Dirty workpiece or welding wire",
      "Inconsistent travel speed",
      "CTWD too long (contact tip to work distance)",
    ],
    solutions: [
      "Verify polarity is correct for the wire/process you are using",
      "Increase gas flow; clean nozzle; maintain proper CTWD",
      "Use shielding gas recommended by wire supplier",
      "Clean to bare metal; ensure wire is free of oil/coatings",
      "Maintain steady travel speed",
      "Reduce CTWD",
    ],
    manual_pages: "Welding Tips — Wire Weld / Flux-Core Weld diagnosis (approx. pages 36–38)",
  },
  {
    symptom_keywords: ["spatter", "spatter is grainy", "large spatter"],
    process: ["mig", "flux-cored"],
    possible_causes: [
      "Dirty workpiece or welding wire",
      "Incorrect polarity",
      "Insufficient shielding gas (MIG)",
      "Wire feeding too fast",
      "CTWD too long",
    ],
    solutions: [
      "Clean to bare metal; ensure wire is clean",
      "Check polarity for the process",
      "Increase gas flow; clean nozzle; maintain CTWD",
      "Reduce wire feed speed",
      "Reduce CTWD",
    ],
    manual_pages: "Welding Tips — Excessive Spatter (approx. pages 37–38)",
  },
];

export function findTroubleshootingEntries(
  problem: string,
  process?: string,
): TroubleEntry[] {
  const p = problem.toLowerCase();
  const proc = process?.toLowerCase();

  return entries.filter((e) => {
    const kw = e.symptom_keywords.some((k) => p.includes(k));
    if (!kw) return false;
    if (!proc || proc === "unknown") return true;
    if (!e.process) return true;
    return e.process.some(
      (x) => x === proc || (proc === "flux" && x === "flux-cored"),
    );
  });
}
