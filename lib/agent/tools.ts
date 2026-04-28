import type Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: "search_manual",
    description:
      "Search the OmniPro 220 manuals (owner manual, quick start, selection chart). Returns passages with page numbers. Use for setup, controls, procedures, and troubleshooting narratives.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        filter_source: {
          type: "string",
          enum: ["owner-manual", "quick-start-guide", "selection-chart", "all"],
        },
        max_results: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_specifications",
    description:
      "Structured lookup for duty cycles, amperage ranges, OCV, materials, wire sizes from Specifications (page 7). Prefer this for numeric spec questions.",
    input_schema: {
      type: "object",
      properties: {
        process: {
          type: "string",
          enum: ["mig", "tig", "stick", "flux-cored", "all"],
        },
        spec_type: {
          type: "string",
          enum: [
            "duty_cycle",
            "amperage_range",
            "voltage",
            "wire_sizes",
            "weldable_materials",
            "all",
          ],
        },
      },
      required: ["process"],
    },
  },
  {
    name: "generate_artifact",
    description:
      "Emit HTML, SVG, or Mermaid for diagrams, calculators, or flowcharts rendered in a sandboxed iframe.",
    input_schema: {
      type: "object",
      properties: {
        artifact_type: {
          type: "string",
          enum: ["html", "svg", "mermaid"],
        },
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["artifact_type", "title", "content"],
    },
  },
  {
    name: "troubleshoot",
    description:
      "Combine manual troubleshooting matrices with retrieval for weld quality issues (porosity, spatter, etc.).",
    input_schema: {
      type: "object",
      properties: {
        problem: { type: "string" },
        process: {
          type: "string",
          enum: ["mig", "flux-cored", "tig", "stick", "unknown"],
        },
      },
      required: ["problem"],
    },
  },
  {
    name: "suggest_followups",
    description:
      "After answering, propose 2–3 short follow-up questions for the user.",
    input_schema: {
      type: "object",
      properties: {
        current_topic: { type: "string" },
        process_context: {
          type: "string",
          enum: ["mig", "flux-cored", "tig", "stick", "general", "setup"],
        },
      },
      required: ["current_topic"],
    },
  },
];
