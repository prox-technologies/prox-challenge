import { nanoid } from "nanoid";
import type { KnowledgeChunk, ManualSource } from "@/lib/types";

export interface PageInput {
  page: number;
  text: string;
  visionDescription?: string;
  imageRef?: string;
}

/** Pages where diagram/schematic content matters; vision description runs at extract time. */
export const VISION_PAGES = new Set<number>([
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  32, 33, 34, 35, 36, 37, 38, 39, 40, 46, 47,
]);

export function getSectionForPage(page: number): string {
  if (page <= 1) return "cover";
  if (page >= 2 && page <= 6) return "safety";
  if (page === 7) return "specifications";
  if (page >= 8 && page <= 9) return "controls";
  if (page >= 10 && page <= 23) return "mig-flux-cored";
  if (page >= 24 && page <= 33) return "tig-stick";
  if (page >= 34 && page <= 40) return "welding-tips";
  if (page >= 41 && page <= 45) return "maintenance";
  if (page >= 46 && page <= 47) return "parts-diagram";
  if (page >= 48) return "warranty";
  return "unknown";
}

function buildChunkText(p: PageInput, section: string): string {
  const header = `[${section}] page ${p.page}\n`;
  const body = p.text.trim();
  const vis = p.visionDescription?.trim();
  if (vis) {
    return `${header}${body}\n\n[Figure / diagram description]\n${vis}`;
  }
  return `${header}${body}`;
}

export function chunkPages(
  pages: PageInput[],
  source: ManualSource,
): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

   for (const p of pages) {
    const section = getSectionForPage(p.page);
    const text = buildChunkText(p, section);
    const tooShort = !text || text.length < 40;
    if (tooShort && !p.imageRef) continue;

    const hasVisual = Boolean(p.visionDescription || p.imageRef);
    const imageRefs = p.imageRef ? [p.imageRef] : [];

    chunks.push({
      id: nanoid(),
      text,
      source,
      section,
      pages: [p.page],
      chunkType: section === "specifications" ? "spec" : "paragraph",
      imageRefs,
      hasVisualContent: hasVisual,
    });
  }

  return chunks;
}
