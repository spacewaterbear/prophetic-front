"use client";

import { useState, useEffect } from "react";
import { Markdown } from "@/components/Markdown";
import { AudioCard } from "@/components/AudioCard";
import { supabase } from "@/lib/supabase/client";

interface AudioRow {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  score: number;
  trend: "up" | "down" | "neutral";
  label: string;
}

const PLACEHOLDER = `# Heading 1
## Heading 2
### Heading 3

This is a paragraph with **bold**, *italic*, and \`inline code\`.

- Item one
- Item two
- Item three

> A blockquote for emphasis.

\`\`\`python
def hello():
    print("Hello, world!")
\`\`\`

| Column A | Column B | Column C |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
`;

export default function TestMarkdownPage() {
  const [input, setInput] = useState(PLACEHOLDER);
  const [isDark, setIsDark] = useState(true);
  const [audioRow, setAudioRow] = useState<AudioRow | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from("audio" as any).select("*").eq("id", "example").maybeSingle().then(({ data, error }) => {
      if (error) {
        setAudioError(error.message);
      } else if (!data) {
        setAudioError("No row found with id = 'example'");
      } else {
        setAudioRow(data as unknown as AudioRow);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
        <h1 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">
          Markdown Preview
        </h1>
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* Audio Card demo */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-3">
          Audio Card
        </label>
        <div className="max-w-sm">
          {audioError && (
            <p className="text-xs text-red-500 font-mono">{audioError}</p>
          )}
          {!audioRow && !audioError && (
            <p className="text-xs text-zinc-400">Loading…</p>
          )}
          {audioRow && (
            <AudioCard
              title={audioRow.title}
              subtitle={audioRow.subtitle}
              src={audioRow.src}
              score={audioRow.score}
              trend={audioRow.trend}
              label={audioRow.label}
            />
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="w-full h-[calc(100vh-10rem)] resize-none rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-shadow"
            placeholder="Paste your markdown here..."
          />
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Preview
          </label>
          <div className="w-full h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
            <Markdown content={input} />
          </div>
        </div>
      </div>
    </div>
  );
}
