"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language?: string;
  children: string;
}

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-terminal-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-terminal-surface text-xs text-terminal-muted">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-terminal-accent"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "12px",
          fontSize: "13px",
          background: "#0d1117",
          borderRadius: 0,
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
