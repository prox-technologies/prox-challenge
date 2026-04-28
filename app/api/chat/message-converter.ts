import type Anthropic from "@anthropic-ai/sdk";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function convertToAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.Messages.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));
}
