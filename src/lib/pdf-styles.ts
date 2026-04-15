/**
 * PDF export style maps used by handleExportPdf in MessageItem.
 * Keeping them here prevents the 130-line object from cluttering the component.
 */

/** Maps CSS class names (from markdown-utils conversions) to inline styles */
export const PDF_CLASS_STYLES: Record<string, string> = {
  "ranking-list":
    "display:flex;flex-direction:column;gap:12px;margin:16px 0;",
  "ranking-card":
    "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
  "ranking-header":
    "display:flex;align-items:center;gap:12px;margin-bottom:12px;",
  "ranking-number":
    "font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:#352ee8;min-width:32px;",
  "ranking-name":
    "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:500;color:#18181b;",
  "ranking-progress-bar":
    "width:100%;height:6px;background:rgba(0,0,0,0.05);border-radius:3px;overflow:hidden;margin-bottom:8px;",
  "ranking-progress-fill":
    "height:100%;background:#352ee8;border-radius:3px;",
  "ranking-description":
    "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;line-height:1.4;",
  "extended-rankings":
    "display:flex;flex-direction:column;gap:12px;margin:20px 0;",
  "extended-ranking-card":
    "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;margin-bottom:8px;",
  "extended-ranking-header":
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;",
  "extended-ranking-number":
    "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#352ee8;letter-spacing:0.5px;",
  "extended-ranking-score":
    "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#18181b;background:rgba(0,0,0,0.05);padding:4px 10px;border-radius:8px;",
  "extended-ranking-name":
    "font-family:'EB Garamond',Georgia,serif;font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;line-height:1.3;",
  "extended-ranking-details":
    "display:flex;flex-direction:column;gap:6px;",
  "extended-ranking-detail":
    "font-family:'Inter',sans-serif;font-size:12px;color:#a1a1aa;line-height:1.5;",
  "allocation-profiles":
    "display:flex;flex-direction:column;gap:16px;margin:20px 0;",
  "allocation-card":
    "background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:20px;margin-bottom:8px;",
  "allocation-title":
    "font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#71717a;letter-spacing:0.5px;margin-bottom:12px;",
  "allocation-divider":
    "width:100%;height:1px;background:#e4e4e7;margin-bottom:16px;",
  "allocation-items": "display:flex;flex-direction:column;gap:14px;",
  "allocation-item": "display:flex;flex-direction:column;gap:6px;",
  "allocation-label":
    "display:flex;justify-content:space-between;align-items:center;",
  "allocation-category":
    "font-family:'Inter',sans-serif;font-size:13px;color:#a1a1aa;",
  "allocation-percentage":
    "font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;font-weight:600;",
  "allocation-progress-bar":
    "width:100%;height:4px;background:rgba(0,0,0,0.05);border-radius:2px;overflow:hidden;",
  "allocation-progress-fill":
    "height:100%;background:#352ee8;border-radius:2px;",
  "allocation-focus":
    "margin-top:16px;padding-top:16px;border-top:1px solid #e4e4e7;",
  "allocation-focus-label":
    "font-family:'Inter',sans-serif;font-size:12px;color:#71717a;margin-bottom:8px;",
  "allocation-focus-artists":
    "display:flex;flex-direction:column;gap:4px;",
  "allocation-artist":
    "font-family:'EB Garamond',Georgia,serif;font-size:13px;color:#a1a1aa;line-height:1.4;",
  "ascii-table-wrapper":
    "margin:16px 0;border-radius:14px;overflow:hidden;",
  "ascii-table":
    "width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:14px;",
  "label-cell":
    "padding:12px 16px;font-size:13px;color:#18181b;font-weight:400;min-width:120px;border-bottom:1px solid #f4f4f5;",
  "value-cell":
    "padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#18181b;text-align:right;border-bottom:1px solid #f4f4f5;",
  "table-scroll-wrapper": "overflow-x:auto;margin:16px 0;",
  "premium-table-container": "",
};

/** Maps HTML tag names to inline styles for unstyled elements */
export const PDF_TAG_STYLES: Record<string, string> = {
  h1: "font-family:'EB Garamond',Georgia,serif;font-size:1.75rem;font-weight:500;color:#18181b;margin:8px 0 16px;letter-spacing:-0.01em;line-height:1.2;",
  h2: "font-family:'EB Garamond',Georgia,serif;font-size:1.25rem;font-weight:500;color:#18181b;margin:20px 0 12px;line-height:1.3;",
  h3: "font-family:'EB Garamond',Georgia,serif;font-size:0.95rem;font-weight:500;color:#52525b;margin:16px 0 12px;",
  h4: "font-family:'EB Garamond',Georgia,serif;font-size:0.875rem;font-weight:500;color:#52525b;margin:14px 0 10px;",
  p:  "margin-bottom:12px;line-height:1.7;color:#18181b;font-family:'Inter',sans-serif;font-size:13px;",
  strong: "color:#18181b;font-weight:600;",
  em: "font-style:italic;color:#52525b;",
  a:  "color:#352ee8;text-decoration:none;",
  ul: "list-style:disc;margin:12px 0;padding-left:20px;",
  ol: "margin:12px 0;padding-left:20px;",
  li: "margin-bottom:6px;font-size:13px;color:#18181b;font-family:'Inter',sans-serif;line-height:1.7;",
  blockquote: "border-left:2px solid #c4a97d;padding-left:14px;margin:16px 0;",
  hr: "border:none;border-top:1px solid #e5e0d8;margin:20px 0;",
  code: "font-family:'JetBrains Mono',monospace;font-size:11px;color:#71717a;background:#f4f4f5;padding:2px 6px;border:1px solid #e4e4e7;border-radius:4px;",
  pre: "background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin-bottom:12px;overflow-x:auto;",
};

/** Maps table-specific HTML tags to inline styles */
export const PDF_TABLE_TAG_STYLES: Record<string, string> = {
  table: "width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e4e4e7;background:#ffffff;",
  thead: "background:#f9f7f4;",
  tbody: "background:#ffffff;",
  th:    "padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;font-family:'Inter',sans-serif;background:#f9f7f4;",
  td:    "padding:10px 14px;font-size:13px;color:#18181b;border-bottom:1px solid #f4f4f5;font-family:'Inter',sans-serif;background:#ffffff;",
  tr:    "border-bottom:1px solid #f4f4f5;background:#ffffff;",
};

// Pre-compiled regex maps — avoids recompiling on every PDF export call.
export const PDF_CLASS_REGEXES: Record<string, RegExp> = Object.fromEntries(
  Object.entries(PDF_CLASS_STYLES)
    .filter(([, style]) => style)
    .map(([cls]) => [cls, new RegExp(`class="([^"]*\\b${cls}\\b[^"]*)"`, "g")]),
);

export const PDF_TAG_REGEXES: Record<string, RegExp> = Object.fromEntries(
  Object.keys(PDF_TAG_STYLES).map((tag) => [
    tag,
    new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
  ]),
);

export const PDF_TABLE_TAG_REGEXES: Record<string, RegExp> = Object.fromEntries(
  Object.keys(PDF_TABLE_TAG_STYLES).map((tag) => [
    tag,
    new RegExp(`<${tag}((?![^>]*style=)[^>]*)>`, "g"),
  ]),
);

/** Inline style applied to code elements inside pre blocks */
export const PDF_PRE_CODE_STYLE =
  "font-family:'JetBrains Mono',monospace;font-size:12px;color:#52525b;background:transparent;border:none;padding:0;white-space:pre-wrap;line-height:1.4;";

/** Wrapper div style that forces light-mode CSS variables for the whole document */
export const PDF_DOCUMENT_WRAPPER_STYLE =
  "font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;color:#18181b;line-height:1.7;padding:20px;background:#ffffff;--bg-card-surface:0 0% 100%;--bg-elevated-surface:32 43% 96%;--border-surface:214 7% 81%;--background:48 29% 97%;--foreground:240 10% 3.9%;--border:240 5.9% 90%;color-scheme:light;";
