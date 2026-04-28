import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import {
  chunkPages,
  VISION_PAGES,
  getSectionForPage,
} from "../lib/utils/chunking";
import { embed } from "../lib/agent/embeddings";
import { storeChunks } from "../lib/agent/vector-search";
import type { KnowledgeChunk, KnowledgeRecord, ManualSource } from "../lib/types";

const FILES_DIR = path.join(process.cwd(), "files");
const IMAGES_DIR = path.join(process.cwd(), "data", "images");

interface PdfPage {
  page: number;
  text: string;
}

async function extractPdfText(pdfPath: string): Promise<PdfPage[]> {
  const mupdf = await import("mupdf");
  const buf = fs.readFileSync(pdfPath);
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const pages: PdfPage[] = [];

  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i);
    const text = page.toStructuredText("preserve-whitespace").asText();
    pages.push({ page: i + 1, text });
  }

  return pages;
}

async function renderPdfPages(
  pdfPath: string,
  prefix: string,
): Promise<Map<number, string>> {
  const mupdf = await import("mupdf");
  const buf = fs.readFileSync(pdfPath);
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const pageImageMap = new Map<number, string>();

  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
    );
    const pngBuffer = pixmap.asPNG();
    const filename = `${prefix}-page-${String(i + 1).padStart(2, "0")}.png`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, pngBuffer);
    pageImageMap.set(i + 1, filepath);
  }

  return pageImageMap;
}

async function describeImage(
  anthropic: Anthropic,
  imagePath: string,
  pageNum: number,
  sectionContext: string,
): Promise<string> {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64,
            },
          },
          {
            type: "text",
            text: `You are analyzing page ${pageNum} of the Vulcan OmniPro 220 manual. Section: ${sectionContext}.

Describe ALL visually important content: labeled diagrams, tables with exact numbers, polarity/socket routing, controls, warnings, weld defect photos.
Be exhaustive; this text will be retrieved by search.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

async function processAndStore(allChunks: KnowledgeChunk[]): Promise<void> {
  console.log("[embed] Local embeddings (all-MiniLM-L6-v2), first run may download ~23MB…");
  const records: KnowledgeRecord[] = [];
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const vector = await embed(chunk.text.slice(0, 2000));
    records.push({ ...chunk, vector });
    if ((i + 1) % 10 === 0 || i === allChunks.length - 1) {
      console.log(`  ${i + 1}/${allChunks.length}`);
    }
  }

  console.log("[lance] Writing LanceDB…");
  await storeChunks(records);
  console.log(`Done. ${records.length} chunks → data/knowledge.lance/`);
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const skipVision = process.env.SKIP_VISION === "1";
  if (!skipVision && !process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set (.env), or set SKIP_VISION=1");
    process.exit(1);
  }

  const anthropic = skipVision ? null : new Anthropic();

  const pdfs: {
    file: string;
    source: ManualSource;
    prefix: string;
  }[] = [
    { file: "owner-manual.pdf", source: "owner-manual", prefix: "manual" },
    {
      file: "quick-start-guide.pdf",
      source: "quick-start-guide",
      prefix: "quickstart",
    },
    {
      file: "selection-chart.pdf",
      source: "selection-chart",
      prefix: "selection-chart",
    },
  ];

  const allChunks: KnowledgeChunk[] = [];

  for (const pdf of pdfs) {
    const pdfPath = path.join(FILES_DIR, pdf.file);
    if (!fs.existsSync(pdfPath)) {
      console.log(`Skip missing: ${pdf.file}`);
      continue;
    }

    console.log(`\n=== ${pdf.file} ===`);
    const textPages = await extractPdfText(pdfPath);
    const imageMap = await renderPdfPages(pdfPath, pdf.prefix);

    const descriptions = new Map<number, string>();
    if (!skipVision && anthropic) {
      let n = 0;
      for (const [pageNum, imagePath] of imageMap) {
        const isOwner = pdf.source === "owner-manual";
        if (isOwner && !VISION_PAGES.has(pageNum)) continue;

        n++;
        const section = isOwner
          ? getSectionForPage(pageNum)
          : String(pdf.source);
        console.log(`  vision ${n}: page ${pageNum} (${section})`);
        try {
          const desc = await describeImage(
            anthropic,
            imagePath,
            pageNum,
            section,
          );
          descriptions.set(pageNum, desc);
          await new Promise((r) => setTimeout(r, 400));
        } catch (e) {
          console.log(`  WARN vision page ${pageNum}: ${e}`);
        }
      }
    } else if (skipVision) {
      console.log("  SKIP_VISION=1 — text-only chunks (faster/cheaper)");
    }

    const pageData = textPages.map((p) => ({
      page: p.page,
      text: p.text,
      visionDescription: descriptions.get(p.page),
      imageRef: imageMap.get(p.page),
    }));

    const chunks = chunkPages(pageData, pdf.source);
    allChunks.push(...chunks);
    console.log(`  chunks: ${chunks.length}`);
  }

  if (allChunks.length === 0) {
    console.error("No chunks produced. Check files/ PDFs.");
    process.exit(1);
  }

  await processAndStore(allChunks);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
