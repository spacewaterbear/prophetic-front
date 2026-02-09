"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/Markdown";

export default function MarkdownTestPage() {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarkdown() {
      try {
        // Read the markdown file from the API route
        const response = await fetch("/api/markdown-test");
        if (!response.ok) {
          throw new Error("Failed to load markdown file");
        }
        const markdownText = await response.text();
        setMarkdownContent(markdownText);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadMarkdown();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Markdown content={markdownContent} />
      </div>
    </div>
  );
}
