"use client";

import { useMemo } from "react";

export function ArtifactFrame(props: {
  type: string;
  title: string;
  content: string;
}) {
  const srcDoc = useMemo(() => {
    if (props.type === "html") {
      return props.content;
    }
    if (props.type === "svg") {
      return `<!DOCTYPE html><html><body style="margin:0;background:#0c0a09;">${props.content}</body></html>`;
    }
    if (props.type === "mermaid") {
      const esc = props.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<!DOCTYPE html><html><head><script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";mermaid.initialize({startOnLoad:true,theme:"dark"});</script></head><body style="margin:0;background:#0c0a09;color:#fafaf9;"><pre class="mermaid">${esc}</pre></body></html>`;
    }
    return `<pre>${props.content}</pre>`;
  }, [props.type, props.content]);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-stone-700 bg-stone-900">
      <div className="border-b border-stone-700 px-3 py-2 text-sm text-orange-400">
        {props.title}
      </div>
      <iframe
        title={props.title}
        className="h-[min(420px,70vh)] w-full bg-stone-950"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
      />
    </div>
  );
}
