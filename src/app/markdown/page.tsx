"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";

export default function MarkdownTestPage() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarkdown() {
      try {
        // Read the markdown file
        const response = await fetch("/50_artistes_a_suivre.md");
        if (!response.ok) {
          throw new Error("Failed to load markdown file");
        }
        const markdownText = await response.text();

        // Configure marked to preserve whitespace and handle code blocks properly
        marked.setOptions({
          breaks: true,
          gfm: true,
        });

        // Convert markdown to HTML
        let html = await marked(markdownText);

        // Post-process to convert ASCII box tables to HTML tables
        html = convertAsciiTablesToHtml(html);

        // Post-process to convert ranking lists to styled cards
        html = convertRankingListsToHtml(html);

        setHtmlContent(html);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadMarkdown();
  }, []);

  // Function to convert ASCII box tables to HTML tables
  function convertAsciiTablesToHtml(html: string): string {
    // Match code blocks that contain ASCII box tables
    const codeBlockRegex = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;

    return html.replace(codeBlockRegex, (match, codeContent) => {
      // Check if this code block contains an ASCII box table
      if (codeContent.includes('╭') && codeContent.includes('╰')) {
        // Extract table rows
        const lines = codeContent.split('\n').filter((line: string) => line.trim());
        const dataRows = lines.filter((line: string) =>
          line.includes('│') && !line.match(/^[╭╰─]+$/)
        );

        if (dataRows.length > 0) {
          // Parse each row
          const tableRows = dataRows.map((row: string) => {
            // Split by │ and clean up
            const cells = row.split('│')
              .filter((cell: string) => cell.trim())
              .map((cell: string) => cell.trim());
            return cells;
          });

          // Generate HTML table
          let tableHtml = '<div class="ascii-table-wrapper"><table class="ascii-table"><tbody>';
          tableRows.forEach((cells: string[]) => {
            tableHtml += '<tr>';
            cells.forEach((cell: string, index: number) => {
              // First column is the label
              if (index === 0) {
                tableHtml += `<td class="label-cell">${cell}</td>`;
              } else {
                tableHtml += `<td class="value-cell">${cell}</td>`;
              }
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table></div>';

          return tableHtml;
        }
      }

      // If not an ASCII table, return the original code block
      return match;
    });
  }

  // Function to convert ranking lists to styled cards
  function convertRankingListsToHtml(html: string): string {
    // Match code blocks that contain ranking lists with progress bars
    const codeBlockRegex = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;

    return html.replace(codeBlockRegex, (match, codeContent) => {
      // Check if this code block contains ranking items with progress bars (▬ characters)
      if (codeContent.includes('▬') && codeContent.match(/#\d+\s+\w+/)) {
        // Parse ranking items
        const lines = codeContent.split('\n').filter((line: string) => line.trim());
        const rankingItems: Array<{ rank: string, name: string, progress: number, description: string }> = [];

        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          // Match pattern: #1  Name       ▬▬▬▬▬▬▬▬▬▬
          const rankMatch = line.match(/^#(\d+)\s+(\w+)\s+(▬+░*)/);

          if (rankMatch) {
            const rank = rankMatch[1];
            const name = rankMatch[2];
            const progressBar = rankMatch[3];

            // Calculate progress percentage based on filled vs unfilled blocks
            const filled = (progressBar.match(/▬/g) || []).length;
            const total = progressBar.length;
            const progress = Math.round((filled / total) * 100);

            // Get description from next line if it exists
            let description = '';
            if (i + 1 < lines.length && !lines[i + 1].trim().match(/^#\d+/)) {
              description = lines[i + 1].trim();
              i++; // Skip the description line
            }

            rankingItems.push({ rank, name, progress, description });
          }
          i++;
        }

        if (rankingItems.length > 0) {
          // Generate HTML for ranking cards
          let rankingHtml = '<div class="ranking-list">';
          rankingItems.forEach((item) => {
            rankingHtml += `
              <div class="ranking-card">
                <div class="ranking-header">
                  <span class="ranking-number">#${item.rank}</span>
                  <span class="ranking-name">${item.name}</span>
                </div>
                <div class="ranking-progress-bar">
                  <div class="ranking-progress-fill" style="width: ${item.progress}%"></div>
                </div>
                ${item.description ? `<div class="ranking-description">${item.description}</div>` : ''}
              </div>
            `;
          });
          rankingHtml += '</div>';

          return rankingHtml;
        }
      }

      // If not a ranking list, return the original code block
      return match;
    });
  }

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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* ═══════════════════════════════════════════════════════════════════════
             DESIGN TOKENS
             ═══════════════════════════════════════════════════════════════════════ */
          
          :root {
            /* Brand */
            --brand-primary: #352ee8;
            --brand-primary-hover: #2a25ba;
            
            /* Background */
            --bg-app: #000000;
            --bg-card: #09090b;
            --bg-elevated: #18181b;
            
            /* Border */
            --border-default: #18181b;
            --border-subtle: #27272a;
            --border-emphasis: #3f3f46;
            
            /* Text */
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --text-tertiary: #71717a;
            --text-muted: #52525b;
            --text-disabled: #3f3f46;
            
            /* Semantic */
            --positive: #22c55e;
            --negative: #ef4444;
            
            /* Typography */
            --font-serif: 'EB Garamond', Georgia, serif;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
            
            /* Spacing */
            --space-1: 4px;
            --space-2: 8px;
            --space-3: 12px;
            --space-4: 16px;
            --space-5: 20px;
            --space-6: 24px;
            
            /* Radius */
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 14px;
          }

          /* ═══════════════════════════════════════════════════════════════════════
             RESET & BASE
             ═══════════════════════════════════════════════════════════════════════ */
          
          .markdown-container * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          .markdown-container {
            font-family: var(--font-sans);
            background: var(--bg-app);
            color: var(--text-secondary);
            -webkit-font-smoothing: antialiased;
            line-height: 1.6;
            font-size: 13px;
            max-width: 400px;
            margin: 0 auto;
            padding: var(--space-6) var(--space-5) var(--space-6);
          }

          /* Tablet view (768px and up) */
          @media (min-width: 768px) {
            .markdown-container {
              max-width: 600px;
              padding: var(--space-6) var(--space-6);
              font-size: 14px;
            }
          }

          /* Desktop view (1024px and up) */
          @media (min-width: 1024px) {
            .markdown-container {
              max-width: 800px;
              padding: 48px 32px;
              font-size: 15px;
            }
          }

          /* ═══════════════════════════════════════════════════════════════════════
             TYPOGRAPHY
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container h1 {
            font-family: var(--font-serif);
            font-size: 1.75rem;
            font-weight: 500;
            color: var(--text-primary);
            margin: var(--space-2) 0 var(--space-4);
            letter-spacing: -0.01em;
          }

          @media (min-width: 768px) {
            .markdown-container h1 {
              font-size: 2rem;
            }
          }

          @media (min-width: 1024px) {
            .markdown-container h1 {
              font-size: 2.25rem;
            }
          }

          .markdown-container h2 {
            font-family: var(--font-serif);
            font-size: 1.125rem;
            font-weight: 500;
            color: var(--text-primary);
            margin: var(--space-5) 0 var(--space-3);
          }

          @media (min-width: 768px) {
            .markdown-container h2 {
              font-size: 1.25rem;
            }
          }

          @media (min-width: 1024px) {
            .markdown-container h2 {
              font-size: 1.5rem;
            }
          }

          .markdown-container h3 {
            font-family: var(--font-serif);
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-secondary);
            margin: var(--space-4) 0 var(--space-3);
          }

          .markdown-container p {
            margin-bottom: var(--space-3);
            line-height: 1.7;
          }

          .markdown-container strong {
            color: var(--text-primary);
            font-weight: 500;
          }

          .markdown-container code {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-muted);
            background: var(--bg-card);
            padding: 2px 6px;
            border-radius: var(--radius-sm);
          }

          @media (min-width: 1024px) {
            .markdown-container code {
              font-size: 12px;
            }
          }

          .markdown-container pre {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 18px;
            margin-bottom: var(--space-3);
            overflow-x: auto;
          }

          @media (min-width: 1024px) {
            .markdown-container pre {
              padding: 24px;
            }
          }

          .markdown-container pre code {
            background: transparent;
            padding: 0;
            font-size: 12px;
            color: var(--text-secondary);
            white-space: pre;
            line-height: 1.2;
          }

          @media (min-width: 1024px) {
            .markdown-container pre code {
              font-size: 13px;
            }
          }

          /* ═══════════════════════════════════════════════════════════════════════
             LISTS
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container ul {
            list-style: none;
            margin: var(--space-3) 0;
          }

          .markdown-container li {
            position: relative;
            padding-left: 14px;
            margin-bottom: 6px;
            font-size: 12px;
          }

          .markdown-container li::before {
            content: "·";
            position: absolute;
            left: 0;
            color: var(--text-muted);
          }

          /* ═══════════════════════════════════════════════════════════════════════
             DIVIDER
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container hr {
            border: none;
            border-top: 1px solid var(--border-default);
            margin: var(--space-5) 0;
          }

          /* ═══════════════════════════════════════════════════════════════════════
             BLOCKQUOTE
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container blockquote {
            border-left: 1px solid var(--border-subtle);
            padding-left: 14px;
            margin: var(--space-4) 0;
          }

          .markdown-container blockquote p {
            font-family: var(--font-serif);
            font-size: 0.95rem;
            font-style: italic;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 6px;
          }

          /* ═══════════════════════════════════════════════════════════════════════
             TABLES (ASCII CONVERTED)
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container .ascii-table-wrapper {
            margin: var(--space-4) 0;
            overflow-x: auto;
            border-radius: var(--radius-lg);
          }

          .markdown-container .ascii-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
          }

          .markdown-container .ascii-table tbody {
            background: var(--bg-card);
          }

          .markdown-container .ascii-table tr {
            border-bottom: 1px solid var(--border-default);
            transition: background-color 0.15s ease;
          }

          .markdown-container .ascii-table tr:last-child {
            border-bottom: none;
          }

          .markdown-container .ascii-table tr:hover {
            background: var(--bg-elevated);
          }

          .markdown-container .ascii-table td {
            padding: 12px 16px;
            font-size: 13px;
            color: var(--text-secondary);
            word-break: break-words;
          }

          @media (min-width: 768px) {
            .markdown-container .ascii-table td {
              padding: 14px 18px;
              font-size: 14px;
            }
          }

          .markdown-container .ascii-table .label-cell {
            color: var(--text-tertiary);
            font-weight: 400;
            min-width: 120px;
          }

          .markdown-container .ascii-table .value-cell {
            color: var(--text-primary);
            font-family: var(--font-mono);
            font-size: 12px;
            text-align: right;
          }

          @media (min-width: 768px) {
            .markdown-container .ascii-table .value-cell {
              font-size: 13px;
            }
          }

          /* ═══════════════════════════════════════════════════════════════════════
             RANKING LISTS
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container .ranking-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-3);
            margin: var(--space-4) 0;
          }

          @media (min-width: 768px) {
            .markdown-container .ranking-list {
              grid-template-columns: repeat(2, 1fr);
              gap: var(--space-4);
            }
          }

          @media (min-width: 1024px) {
            .markdown-container .ranking-list {
              grid-template-columns: repeat(3, 1fr);
            }
          }

          .markdown-container .ranking-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
          }

          .markdown-container .ranking-card:hover {
            background: var(--bg-elevated);
            border-color: var(--border-hover);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .markdown-container .ranking-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .markdown-container .ranking-number {
            font-family: var(--font-mono);
            font-size: 18px;
            font-weight: 600;
            color: var(--brand-primary);
            min-width: 32px;
          }

          .markdown-container .ranking-name {
            font-family: var(--font-serif);
            font-size: 16px;
            font-weight: 500;
            color: var(--text-primary);
            letter-spacing: -0.01em;
          }

          .markdown-container .ranking-progress-bar {
            width: 100%;
            height: 6px;
            background: var(--bg-app);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
          }

          .markdown-container .ranking-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
            border-radius: 3px;
            transition: width 0.3s ease;
          }

          .markdown-container .ranking-description {
            font-family: var(--font-sans);
            font-size: 12px;
            color: var(--text-tertiary);
            line-height: 1.4;
          }

          @media (min-width: 768px) {
            .markdown-container .ranking-description {
              font-size: 13px;
            }
          }

          /* ═══════════════════════════════════════════════════════════════════════
             UTILITIES
             ═══════════════════════════════════════════════════════════════════════ */

          .markdown-container .text-accent {
            color: var(--brand-primary);
          }

          .markdown-container .text-muted {
            color: var(--text-muted);
          }
        `
      }} />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />

      <div
        className="markdown-container"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  );
}
