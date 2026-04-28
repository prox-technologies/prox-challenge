"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArtifactFrame } from "@/components/artifacts/artifact-frame";
import { Mic, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

type Artifact = { id: string; type: string; title: string; content: string };

export function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [kb, setKb] = useState<{ ready: boolean; imageCount: number } | null>(
    null,
  );
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [trace, setTrace] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshKb = useCallback(async () => {
    const r = await fetch("/api/knowledge-status");
    setKb(await r.json());
  }, []);

  useEffect(() => {
    refreshKb();
  }, [refreshKb]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, artifacts, trace]);

  const runChat = async (text: string) => {
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    setTrace([]);
    setArtifacts([]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });

    if (!res.ok || !res.body) {
      setBusy(false);
      setMessages((m) => [
        ...m.slice(0, -1),
        {
          role: "assistant",
          content: "Request failed. Is ANTHROPIC_API_KEY set?",
        },
      ]);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(json);
        } catch {
          continue;
        }
        if (ev.type === "text") {
          const t = String(ev.text ?? "");
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = {
                role: "assistant",
                content: last.content + t,
              };
            }
            return copy;
          });
        }
        if (ev.type === "tool-status") {
          setTrace((tr) => [
            ...tr,
            `${String(ev.status)}: ${String(ev.toolName)}`,
          ]);
        }
        if (ev.type === "artifact") {
          setArtifacts((a) => [
            ...a,
            {
              id: String(ev.id),
              type: String(ev.artifact_type ?? "html"),
              title: String(ev.title ?? "Artifact"),
              content: String(ev.content ?? ""),
            },
          ]);
        }
        if (ev.type === "followups") {
          setTrace((tr) => [...tr, `followups: ${JSON.stringify(ev)}`]);
        }
        if (ev.type === "error") {
          setTrace((tr) => [...tr, `error: ${String(ev.message)}`]);
        }
      }
    }

    setBusy(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    await runChat(t);
  };

  const onVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.onresult = (e2) => {
      const t = e2.results[0]?.[0]?.transcript ?? "";
      setInput(t);
    };
    r.start();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="mb-6 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-orange-500">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-xl font-semibold tracking-tight text-stone-100">
            OmniPro 220 Assistant
          </h1>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Multimodal manual-grounded helper — run{" "}
          <code className="rounded bg-stone-800 px-1">npm run extract</code>{" "}
          once, then chat.
        </p>
        {kb && (
          <p className="mt-2 text-xs text-stone-600">
            Knowledge base:{" "}
            {kb.ready ? (
              <span className="text-emerald-500">ready</span>
            ) : (
              <span className="text-amber-500">not built</span>
            )}
            {kb.imageCount ? ` · ${kb.imageCount} page images` : null}
          </p>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-700 p-6 text-stone-500">
            Try: &quot;What&apos;s the duty cycle for MIG at 200A on
            240V?&quot; or &quot;TIG polarity — which socket for ground?&quot;
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg bg-stone-800 px-4 py-3 text-stone-100"
                : "mr-8 rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3 text-stone-200"
            }
          >
            {m.role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            ) : (
              m.content
            )}
          </div>
        ))}
        {artifacts.map((a) => (
          <ArtifactFrame
            key={a.id}
            type={a.type}
            title={a.title}
            content={a.content}
          />
        ))}
        {trace.length > 0 && (
          <details className="text-xs text-stone-600">
            <summary className="cursor-pointer">Tool trace</summary>
            <ul className="mt-2 list-inside list-disc">
              {trace.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </details>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 mt-4 flex gap-2 border-t border-stone-800 bg-[var(--background)] pt-4"
      >
        <button
          type="button"
          onClick={onVoice}
          className="rounded-lg border border-stone-700 p-3 text-stone-400 hover:bg-stone-900"
          title="Voice input"
        >
          <Mic className="h-5 w-5" />
        </button>
        <input
          className="flex-1 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-orange-600"
          placeholder="Ask about setup, specs, troubleshooting…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
