import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
4. If documentation does not contain enough information, say so.
5. Explain welding setup steps clearly.
6. For polarity, wiring, controls, diagrams, or visual questions, inspect
   relevant images in knowledge/images.
7. Mention relevant manual page when possible.
8. If ambiguous, ask a short clarification question.
9. Prioritize safety.
10. Answer like a knowledgeable welding technician helping someone in a garage.
"""

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Question(BaseModel):
    question: str


@app.get("/")
def root():
    return {"status": "Prox Welder Expert API is running"}


@app.post("/ask")
async def ask(data: Question):
    prompt = f"""
User question:
{data.question}

Use the documentation in the knowledge directory to answer accurately.
"""

    answer = ""

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
            answer = message.result

    return {"answer": answer}