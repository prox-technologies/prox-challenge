import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from claude_agent_sdk import query, ClaudeAgentOptions

load_dotenv()

KNOWLEDGE_DIR = Path("knowledge").resolve()

SYSTEM_PROMPT = f"""
You are Prox Welder Expert, an expert assistant for the Vulcan OmniPro 220
multiprocess welding system.

Your knowledge comes ONLY from the provided manufacturer documentation.

Knowledge directory:
{KNOWLEDGE_DIR}

Available documents:
- owner-manual.txt
- quick-start-guide.txt
- selection-chart.txt
- images/ containing extracted manual diagrams and figures

IMPORTANT:
1. Give technically accurate answers.
2. Cross-reference multiple sections when necessary.
3. Never invent specifications.
4. If the documentation does not contain enough information, say so.
5. For welding setup questions, explain the steps clearly.
6. For polarity, wiring, controls, diagrams, or visual questions, inspect
   the relevant images in knowledge/images.
7. Mention the relevant manual page when possible.
8. If the user's question is ambiguous, ask a short clarification question.
9. Prioritize safety. Never encourage bypassing safety protections.
10. Answer like a knowledgeable welding technician helping someone in a garage.

You have access to the local knowledge directory and should use it when answering.
"""

async def main():
    print("🔥 Prox Welder Expert")
    print("Ask a question. Type 'exit' to quit.\n")

    while True:
        question = input("You: ").strip()

        if question.lower() in {"exit", "quit"}:
            break

        if not question:
            continue

        prompt = f"""
User question:
{question}

Use the documentation in the knowledge directory to answer accurately.
"""

        async for message in query(
            prompt=prompt,
            options=ClaudeAgentOptions(
                system_prompt=SYSTEM_PROMPT,
                allowed_tools=[
                    "Read",
                    "Glob",
                    "Grep",
                ],
            ),
        ):
            if hasattr(message, "result") and message.result:
                print(f"\nAssistant:\n{message.result}\n")


if __name__ == "__main__":
    asyncio.run(main())