import fs from "fs";
import path from "path";
import { searchKnowledge, knowledgeExists } from "./vector-search";
import { getSpecifications } from "@/lib/data/specifications";
import { findTroubleshootingEntries } from "@/lib/data/troubleshooting";
import type Anthropic from "@anthropic-ai/sdk";

interface ToolResult {
  result: unknown;
  imageRefs?: string[];
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<ToolResult> {
  switch (toolName) {
    case "search_manual":
      return await handleSearchManual(toolInput);
    case "get_specifications":
      return handleGetSpecifications(toolInput);
    case "generate_artifact":
      return {
        result: {
          type: toolInput.artifact_type,
          title: toolInput.title,
          content: toolInput.content,
        },
      };
    case "troubleshoot":
      return await handleTroubleshoot(toolInput);
    case "suggest_followups":
      return {
        result: {
          topic: toolInput.current_topic,
          context: toolInput.process_context,
        },
      };
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

async function handleSearchManual(
  input: Record<string, unknown>,
): Promise<ToolResult> {
  if (!knowledgeExists()) {
    return {
      result: {
        error:
          "Knowledge base not found. Run `npm run extract` (requires ANTHROPIC_API_KEY for vision pages).",
      },
    };
  }

  const query = input.query as string;
  const filterSource = (input.filter_source as string) || "all";
  const maxResults = Math.min((input.max_results as number) || 5, 10);

  const results = await searchKnowledge(query, maxResults, filterSource);

  const imageRefs: string[] = [];
  for (const r of results) {
    if (r.imageRefs?.length) imageRefs.push(...r.imageRefs);
  }

  return {
    result: results.map((r) => ({
      text: r.text,
      section: r.section,
      pages: r.pages,
      type: r.chunkType,
      hasVisualContent: r.hasVisualContent,
    })),
    imageRefs: [...new Set(imageRefs)].slice(0, 3),
  };
}

function handleGetSpecifications(input: Record<string, unknown>): ToolResult {
  const process = input.process as string;
  const specType = input.spec_type as string | undefined;
  return { result: getSpecifications(process, specType) };
}

async function handleTroubleshoot(
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const problem = input.problem as string;
  const weldingProcess = input.process as string | undefined;

  const hardcodedResults = findTroubleshootingEntries(
    problem,
    weldingProcess,
  );

  let searchResults: unknown[] = [];
  if (knowledgeExists()) {
    const results = await searchKnowledge(
      `troubleshooting ${problem}`,
      4,
      "owner-manual",
    );
    searchResults = results.map((r) => ({
      text: r.text,
      section: r.section,
      pages: r.pages,
    }));
  }

  const imageRefs: string[] = [];
  const diagnosisKeywords = [
    "porosity",
    "spatter",
    "burn",
    "penetration",
    "bead",
    "weld quality",
  ];
  if (diagnosisKeywords.some((kw) => problem.toLowerCase().includes(kw))) {
    const cwd = process.cwd();
    for (let p = 35; p <= 40; p++) {
      const imgPath = path.join(
        cwd,
        "data",
        "images",
        `manual-page-${String(p).padStart(2, "0")}.png`,
      );
      if (fs.existsSync(imgPath)) imageRefs.push(imgPath);
    }
  }

  return {
    result: {
      structured_hints: hardcodedResults,
      manual_chunks: searchResults,
    },
    imageRefs: imageRefs.slice(0, 2),
  };
}

export function buildToolResultContent(
  result: unknown,
  imageRefs?: string[],
): Anthropic.Messages.ToolResultBlockParam["content"] {
  const content: (
    | Anthropic.Messages.TextBlockParam
    | Anthropic.Messages.ImageBlockParam
  )[] = [{ type: "text", text: JSON.stringify(result, null, 2) }];

  if (imageRefs?.length) {
    for (const ref of imageRefs.slice(0, 2)) {
      try {
        if (fs.existsSync(ref)) {
          const imageData = fs.readFileSync(ref);
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageData.toString("base64"),
            },
          });
        }
      } catch {
        /* skip */
      }
    }
  }

  return content;
}
