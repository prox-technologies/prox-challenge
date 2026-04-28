import { nanoid } from "nanoid";
import { getAnthropicClient } from "@/lib/agent/anthropic-client";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { TOOL_DEFINITIONS } from "@/lib/agent/tools";
import {
  executeToolCall,
  buildToolResultContent,
} from "@/lib/agent/tool-executor";
import { convertToAnthropicMessages } from "./message-converter";
import type Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const anthropic = getAnthropicClient();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendData(data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const anthropicMessages = convertToAnthropicMessages(messages);
        let continueLoop = true;
        const MAX_ITERATIONS = 10;
        let iteration = 0;

        while (continueLoop && iteration < MAX_ITERATIONS) {
          iteration++;

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            tools: TOOL_DEFINITIONS,
            messages: anthropicMessages,
          });

          const toolUses: Anthropic.Messages.ToolUseBlock[] = [];
          let textContent = "";

          for (const block of response.content) {
            if (block.type === "text") textContent += block.text;
            if (block.type === "tool_use") toolUses.push(block);
          }

          if (textContent) sendData({ type: "text", text: textContent });

          if (toolUses.length > 0) {
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              sendData({
                type: "tool-status",
                toolName: toolUse.name,
                status: "running",
                input: toolUse.input,
              });

              const toolResult = await executeToolCall(
                toolUse.name,
                toolUse.input as Record<string, unknown>,
              );

              if (toolUse.name === "generate_artifact") {
                const ar = toolResult.result as {
                  type?: string;
                  title?: string;
                  content?: string;
                };
                sendData({
                  type: "artifact",
                  id: nanoid(),
                  artifact_type: ar.type ?? "html",
                  title: ar.title ?? "Artifact",
                  content: ar.content ?? "",
                });
              }

              if (toolUse.name === "suggest_followups") {
                sendData({
                  type: "followups",
                  id: nanoid(),
                  ...(toolResult.result as Record<string, unknown>),
                });
              }

              sendData({
                type: "tool-status",
                toolName: toolUse.name,
                status: "completed",
              });

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: buildToolResultContent(
                  toolResult.result,
                  toolResult.imageRefs,
                ),
              });
            }

            anthropicMessages.push({
              role: "assistant",
              content: response.content,
            });
            anthropicMessages.push({
              role: "user",
              content: toolResults,
            });
          }

          continueLoop = response.stop_reason === "tool_use";
        }

        sendData({ type: "done" });
      } catch (error) {
        sendData({
          type: "error",
          message:
            error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
