import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
  categoryName?: string;
  onCategoryClick?: () => void;
}

export function Markdown({ content, className, categoryName, onCategoryClick }: MarkdownProps) {
  // Helper function to convert ASCII tables to markdown tables
  const convertAsciiTableToMarkdown = (asciiTable: string): string => {
    const lines = asciiTable.split('\n');

    // Extract rows that contain data (have │ character)
    const dataRows = lines
      .filter(line => line.includes('│') && !line.trim().match(/^[┌┐└┘├┤┬┴┼─━╔╗╚╝╠╣╦╩╬═]+$/))
      .map(line => {
        // Split by │ and clean up each cell
        return line
          .split('│')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
      })
      .filter(row => row.length > 0);

    if (dataRows.length === 0) return asciiTable;

    // Check if this is a key-value table (2 columns, no clear header row)
    const isKeyValueTable = dataRows.every(row => row.length === 2) && dataRows.length > 2;

    // Determine if first row is a header (usually has different styling or is followed by separator)
    const hasHeaderSeparator = lines.some(line =>
      line.includes('├') || line.includes('╠') || line.match(/^[━─]+$/)
    );

    const markdownLines: string[] = [];

    if (isKeyValueTable && !hasHeaderSeparator) {
      // Key-value table: create empty header and use all rows as data
      markdownLines.push('|   |   |');
      markdownLines.push('| --- | --- |');

      dataRows.forEach(row => {
        markdownLines.push(`| ${row[0]} | ${row[1]} |`);
      });
    } else if (hasHeaderSeparator && dataRows.length > 1) {
      // First row is header
      const header = dataRows[0];
      const separator = header.map(() => '---');

      markdownLines.push(`| ${header.join(' | ')} |`);
      markdownLines.push(`| ${separator.join(' | ')} |`);

      // Rest are body rows
      dataRows.slice(1).forEach(row => {
        // Pad row to match header length
        while (row.length < header.length) row.push('');
        markdownLines.push(`| ${row.join(' | ')} |`);
      });
    } else {
      // No clear header, treat first row as header
      const header = dataRows[0];
      const separator = header.map(() => '---');

      markdownLines.push(`| ${header.join(' | ')} |`);
      markdownLines.push(`| ${separator.join(' | ')} |`);

      dataRows.slice(1).forEach(row => {
        while (row.length < header.length) row.push('');
        markdownLines.push(`| ${row.join(' | ')} |`);
      });
    }

    return markdownLines.join('\n');
  };

  // Helper function to convert pipe-delimited ASCII tables to markdown tables
  const convertPipeTableToMarkdown = (content: string): string => {
    // Match tables with pipe delimiters and dash separator lines
    // Pattern: lines with |---| or similar horizontal separators
    const tablePattern = /^(\|[-=]+\|[\r\n]+)((?:\|.+\|[\r\n]+)+)(\|[-=]+\|)?/gm;

    return content.replace(tablePattern, (match) => {
      const lines = match.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // Filter out separator lines (lines with only pipes and dashes/equals)
      const dataRows = lines.filter(line => {
        const withoutPipes = line.replace(/\|/g, '').trim();
        return withoutPipes.length > 0 && !withoutPipes.match(/^[-=]+$/);
      });

      if (dataRows.length === 0) return match;

      // Extract cells from each row
      const rows = dataRows.map(line => {
        return line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
      });

      if (rows.length === 0) return match;

      // Determine the maximum number of columns
      const maxCols = Math.max(...rows.map(row => row.length));

      // Treat first row as header (or create empty header for key-value tables)
      const header = rows[0];
      while (header.length < maxCols) header.push('');

      const separator = Array(maxCols).fill('---');

      // Build markdown table
      const markdownLines = [
        `| ${header.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...rows.slice(1).map(row => {
          while (row.length < maxCols) row.push('');
          return `| ${row.join(' | ')} |`;
        })
      ];

      return '\n' + markdownLines.join('\n') + '\n';
    });
  };

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Post-processing to remove wrapping markdown code blocks if present
  // This handles cases where the AI wraps the entire response in ```markdown ... ```
  const processedContent = React.useMemo(() => {
    // First, decode HTML entities
    const decoded = decodeHtmlEntities(content);
    let trimmed = decoded.trim();

    // Check if content is wrapped in HTML pre/code tags and unwrap it
    // Pattern: <pre ...><code ...>content</code></pre>
    const htmlWrapperMatch = trimmed.match(/^<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>$/i);
    if (htmlWrapperMatch) {
      trimmed = htmlWrapperMatch[1].trim();
    }

    // Try multiple patterns to unwrap code blocks
    // Pattern 1: Standard triple backticks with optional language
    let codeBlockMatch = trimmed.match(/^```(?:\w+)?\n?([\s\S]*?)\n?```$/);

    // Pattern 2: Code blocks with extra whitespace
    if (!codeBlockMatch) {
      codeBlockMatch = trimmed.match(/^```\s*(?:\w+)?\s*\n([\s\S]*?)\n\s*```\s*$/);
    }

    // Pattern 3: Just backticks without language specifier
    if (!codeBlockMatch) {
      codeBlockMatch = trimmed.match(/^```\n([\s\S]*?)\n```$/);
    }

    let unwrapped = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

    // Additional check: if content starts with markdown headers or separators,
    // it's likely markdown that should be unwrapped
    const looksLikeMarkdown = /^(#{1,6}\s|─{3,}|━{3,}|┌|╔)/.test(unwrapped);

    // If it looks like markdown but is still wrapped in a code block pattern, force unwrap
    if (looksLikeMarkdown && unwrapped.includes('```')) {
      const forceUnwrap = unwrapped.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
      if (forceUnwrap) {
        unwrapped = forceUnwrap[1].trim();
      }
    }

    // First, convert pipe-delimited ASCII tables to markdown tables
    unwrapped = convertPipeTableToMarkdown(unwrapped);

    // Convert ASCII tables to markdown tables
    // Match code blocks that contain ASCII tables
    unwrapped = unwrapped.replace(/```\n([\s\S]*?)```/g, (match, codeContent) => {
      const trimmedCode = codeContent.trim();
      // Check if this is an ASCII table
      const isAsciiTable =
        trimmedCode.startsWith('┌') ||
        trimmedCode.startsWith('╔') ||
        trimmedCode.startsWith('┏') ||
        trimmedCode.startsWith('━') ||
        trimmedCode.startsWith('─') ||
        (trimmedCode.includes('│') && (trimmedCode.includes('─') || trimmedCode.includes('━')));

      if (isAsciiTable) {
        return '\n' + convertAsciiTableToMarkdown(trimmedCode) + '\n';
      }
      return match;
    });

    // Convert pipe-separated lines into markdown tables
    // Look for consecutive lines that all contain multiple pipes
    unwrapped = unwrapped.replace(/^((?:^.+\|.+\|.+$\n?)+)/gm, (match) => {
      const lines = match.trim().split('\n');

      // Check if this looks like table data (multiple lines with pipes)
      if (lines.length >= 2 && lines.every(line => (line.match(/\|/g) || []).length >= 2)) {
        // Split each line by pipe and clean up
        const rows = lines.map(line =>
          line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
        );

        // Find the maximum number of columns
        const maxCols = Math.max(...rows.map(row => row.length));

        // Create markdown table
        const header = rows[0];
        while (header.length < maxCols) header.push('');

        const separator = Array(maxCols).fill('---');

        const tableLines = [
          `| ${header.join(' | ')} |`,
          `| ${separator.join(' | ')} |`,
          ...rows.slice(1).map(row => {
            while (row.length < maxCols) row.push('');
            return `| ${row.join(' | ')} |`;
          })
        ];

        return '\n' + tableLines.join('\n') + '\n';
      }

      return match;
    });

    // Fix markdown headers that are not on their own line
    // This ensures headers starting with # have proper line breaks before them
    unwrapped = unwrapped.replace(/([^\n])(#{1,6}\s+)/g, (match, before, header) => {
      // If the character before the # is not a newline, add two newlines
      return before + '\n\n' + header;
    });

    return unwrapped;
  }, [content]);

  // Helper to process -+- markers in text - removes -+- and returns cleaned content
  const removeAnalysisMarker = (content: React.ReactNode): React.ReactNode => {
    const childArray = React.Children.toArray(content);

    return childArray.map((child) => {
      if (typeof child === 'string') {
        // Remove -+- from the string
        return child.replace(/-\+-/g, '').trim();
      }
      return child;
    });
  };

  // Helper to check if content contains -+- markers
  const hasAnalysisMarker = (content: React.ReactNode): boolean => {
    return React.Children.toArray(content).some(
      (child) => typeof child === 'string' && child.includes('-+-')
    );
  };

  // Reusable component for analysis highlight with tooltip
  const AnalysisHighlight = ({ children }: { children: React.ReactNode }) => {
    const handleClick = () => {
      // Get the text content without the -+- marker
      const textContent = React.Children.toArray(children)
        .map(child => (typeof child === 'string' ? child.replace(/-\+-/g, '').trim() : ''))
        .join(' ')
        .trim();

      if (textContent) {
        // Dispatch custom event for the chat page to catch (same as SelectionContextMenu)
        const event = new CustomEvent("triggerDeepSearch", {
          detail: { text: textContent }
        });
        window.dispatchEvent(event);
      }
    };

    return (
      <span
        className="relative group/analysis inline bg-gradient-to-r from-amber-100/20 to-yellow-100/20 dark:from-amber-900/40 dark:to-yellow-900/40 px-1 rounded border-l-2 border-amber-500 dark:border-amber-400 cursor-pointer transition-all hover:shadow-md box-decoration-clone"
        onClick={handleClick}
      >
        {removeAnalysisMarker(children)}
        <span className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-800 text-xs rounded hidden group-hover/analysis:block whitespace-nowrap pointer-events-none z-10">
          make an analysis
        </span>
      </span>
    );
  };

  return (
    <div className="relative">
      {categoryName && onCategoryClick && (
        <div className="hidden flex justify-start mb-4">
          <button
            onClick={onCategoryClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            {categoryName}
          </button>
        </div>
      )}
      <div className={cn("max-w-none px-0", className)} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Headings - Premium minimal styling
            h1: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <h1 className="text-2xl font-light mt-6 mb-4 text-gray-900 dark:text-white tracking-tight" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h1>
                );
              }
              return <h1 className="text-2xl font-light mt-6 mb-4 text-gray-900 dark:text-white tracking-tight" {...props}>{children}</h1>;
            },
            h2: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <h2 className="text-xl font-light mt-5 mb-3 text-gray-900 dark:text-white tracking-tight" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h2>
                );
              }
              return <h2 className="text-xl font-light mt-5 mb-3 text-gray-900 dark:text-white tracking-tight" {...props}>{children}</h2>;
            },
            h3: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <h3 className="text-lg font-normal mt-4 mb-2 text-gray-900 dark:text-white" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h3>
                );
              }
              return <h3 className="text-lg font-normal mt-4 mb-2 text-gray-900 dark:text-white" {...props}>{children}</h3>;
            },
            h4: ({ node, children, ...props }) => {
              // Check if this looks like a label (short, uppercase-ish text)
              const textContent = React.Children.toArray(children).map(c => String(c)).join('');
              const looksLikeLabel = textContent.length < 30 && textContent === textContent.toUpperCase();

              if (looksLikeLabel) {
                return (
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500 mt-5 mb-2" {...props}>
                    {hasAnalysisMarker(children) ? <AnalysisHighlight>{children}</AnalysisHighlight> : children}
                  </h4>
                );
              }
              if (hasAnalysisMarker(children)) {
                return (
                  <h4 className="text-base font-normal mt-3 mb-2 text-gray-900 dark:text-white" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h4>
                );
              }
              return <h4 className="text-base font-normal mt-3 mb-2 text-gray-900 dark:text-white" {...props}>{children}</h4>;
            },
            h5: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <h5 className="text-sm font-medium mt-3 mb-2 text-gray-800 dark:text-zinc-300" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h5>
                );
              }
              return <h5 className="text-sm font-medium mt-3 mb-2 text-gray-800 dark:text-zinc-300" {...props}>{children}</h5>;
            },
            h6: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <h6 className="text-sm font-normal mt-3 mb-2 text-gray-700 dark:text-zinc-400" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </h6>
                );
              }
              return <h6 className="text-sm font-normal mt-3 mb-2 text-gray-700 dark:text-zinc-400" {...props}>{children}</h6>;
            },
            // Paragraphs - Clean zinc styling
            p: ({ node, children, ...props }) => {
              // Helper to check for ASCII table/box patterns
              // Use React.Children to safely handle children, looking at the first child if it's a string
              const firstChild = React.Children.toArray(children)[0];
              const isAsciiTable =
                typeof firstChild === 'string' &&
                firstChild.trim().startsWith('┌');

              // Check if this is a horizontal separator line (long sequence of dashes or equals)
              const isHorizontalSeparator =
                typeof firstChild === 'string' &&
                /^[-=─━]{10,}$/.test(firstChild.trim());

              // Check if content contains long dash lines (even with text in between or mixed with other elements)
              let containsLongDashLines = false;
              React.Children.forEach(children, (child) => {
                if (typeof child === 'string' && /[\-=\u2500-\u257F]{30,}/.test(child)) {
                  containsLongDashLines = true;
                }
              });

              if (isAsciiTable) {
                return (
                  <div className="table-scroll-wrapper my-4">
                    <p
                      className="md-mono whitespace-pre leading-tight mb-0 text-zinc-600 dark:text-zinc-400"
                      {...props}
                    >
                      {children}
                    </p>
                  </div>
                );
              }

              if (isHorizontalSeparator) {
                return (
                  <div className="my-6 w-full max-w-full overflow-hidden">
                    <div className="border-t border-zinc-300 dark:border-zinc-800" />
                  </div>
                );
              }

              // Handle paragraphs with long separator lines mixed with other content
              if (containsLongDashLines) {
                // Process children to split text and separators into separate elements
                const elements: React.ReactNode[] = [];
                let textBuffer: React.ReactNode[] = [];

                React.Children.forEach(children, (child, index) => {
                  if (typeof child === 'string') {
                    // Split by long dash sequences using Unicode escape sequences
                    const parts = child.split(/([\-=\u2500-\u257F]{30,})/);
                    parts.forEach((part, partIndex) => {
                      if (/^[\-=\u2500-\u257F]{30,}$/.test(part)) {
                        // Flush text buffer if any
                        if (textBuffer.length > 0) {
                          elements.push(
                            <p key={`text-${index}-${partIndex}`} className="mb-2 leading-relaxed overflow-hidden text-gray-700 dark:text-zinc-400">
                              {textBuffer}
                            </p>
                          );
                          textBuffer = [];
                        }
                        // Add horizontal rule as a separate element
                        elements.push(
                          <hr key={`hr-${index}-${partIndex}`} className="my-4 border-zinc-300 dark:border-zinc-800" />
                        );
                      } else if (part) {
                        textBuffer.push(part);
                      }
                    });
                  } else {
                    textBuffer.push(child);
                  }
                });

                // Flush remaining text buffer
                if (textBuffer.length > 0) {
                  elements.push(
                    <p key="text-final" className="mb-2 leading-relaxed overflow-hidden text-gray-700 dark:text-zinc-400">
                      {textBuffer}
                    </p>
                  );
                }

                return <div className="mb-4">{elements}</div>;
              }

              // Check if content contains -+- markers for analysis highlighting
              if (hasAnalysisMarker(children)) {
                return (
                  <p className="leading-relaxed px-0 text-gray-700 dark:text-zinc-400" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </p>
                );
              }

              return (
                <p className="leading-relaxed px-0 text-gray-700 dark:text-zinc-400 mb-3" {...props}>
                  {children}
                </p>
              );
            },
            // Lists - Clean spacing
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-zinc-400" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-zinc-400" {...props} />
            ),
            li: ({ node, children, ...props }) => {
              if (hasAnalysisMarker(children)) {
                return (
                  <li className="leading-relaxed" {...props}>
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </li>
                );
              }
              return <li className="leading-relaxed" {...props}>{children}</li>;
            },
            // Code - JetBrains Mono styling
            code: ({ node, className, children, ...props }) => {
              // In react-markdown v10, the `inline` prop indicates if it's inline code
              const { inline } = props as { inline?: boolean };

              // Helper to check for ASCII table/box patterns in block code
              const content = String(children).trim();
              const isAsciiArt = !inline && (
                content.startsWith('┌') ||
                content.startsWith('╔') ||
                content.startsWith('╭') ||
                content.startsWith('┏') ||
                content.startsWith('+') ||
                content.startsWith('━') ||
                content.startsWith('─') ||
                content.includes('│') ||
                content.includes('┊') ||
                content.includes('├') ||
                content.includes('┤') ||
                content.includes('┼') ||
                content.includes('╰') ||
                content.includes('╯') ||
                content.includes('▬') ||
                content.includes('░') ||
                content.includes('●') ||
                content.includes('○') ||
                content.includes('◆') ||
                content.includes('▲') ||
                content.includes('▼')
              );

              if (inline) {
                return (
                  <code
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 px-1.5 py-0.5 rounded text-sm md-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              // Custom styling for ASCII art/tables to preserve formatting
              if (isAsciiArt) {
                return (
                  <code
                    className="block bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre leading-relaxed md-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              // Standard block code styling
              return (
                <code
                  className="block bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 p-4 rounded-xl overflow-x-auto text-sm md-mono my-4 whitespace-pre-wrap"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ node, children, ...props }) => {
              // Check if the content is ASCII art to apply special styling
              const firstChild = React.Children.toArray(children)[0];
              let isAsciiArt = false;

              if (React.isValidElement(firstChild) && firstChild.props.children) {
                const content = String(firstChild.props.children).trim();
                isAsciiArt =
                  content.startsWith('┌') ||
                  content.startsWith('╔') ||
                  content.startsWith('╭') ||
                  content.startsWith('┏') ||
                  content.startsWith('+') ||
                  content.startsWith('━') ||
                  content.startsWith('─') ||
                  content.includes('│') ||
                  content.includes('┊') ||
                  content.includes('├') ||
                  content.includes('┤') ||
                  content.includes('┼') ||
                  content.includes('╰') ||
                  content.includes('╯') ||
                  content.includes('▬') ||
                  content.includes('░') ||
                  content.includes('●') ||
                  content.includes('○') ||
                  content.includes('◆') ||
                  content.includes('▲') ||
                  content.includes('▼');
              }

              return (
                <pre
                  className={cn(
                    "overflow-x-auto my-4 block whitespace-pre",
                    isAsciiArt
                      ? "bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4"
                      : "bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4"
                  )}
                  {...props}
                >
                  {children}
                </pre>
              );
            },
            // Blockquote - Minimal left border styling
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4 py-2 my-4 italic text-zinc-600 dark:text-zinc-400"
                {...props}
              />
            ),
            // Links - Blue accent
            a: ({ node, ...props }) => (
              <a
                className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-500 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            // Horizontal rule - Subtle zinc border
            hr: ({ node, ...props }) => (
              <hr className="my-6 border-zinc-300 dark:border-zinc-800" {...props} />
            ),
            // Tables - Premium grid styling
            table: ({ node, children, ...props }) => {
              // Simpler approach: check if table has only 1 column by counting th/td in first row
              let isSingleColumn = false;

              try {
                // Convert children to array and look for thead/tbody
                const childArray = React.Children.toArray(children);

                for (const section of childArray) {
                  if (React.isValidElement(section)) {
                    const sectionChildren = React.Children.toArray(section.props?.children || []);

                    for (const row of sectionChildren) {
                      if (React.isValidElement(row)) {
                        const cells = React.Children.toArray(row.props?.children || []);
                        // Count valid cell elements
                        const cellCount = cells.filter(cell => React.isValidElement(cell)).length;

                        if (cellCount > 0) {
                          isSingleColumn = cellCount === 1;
                          break;
                        }
                      }
                    }

                    if (isSingleColumn !== false) break;
                  }
                }
              } catch (e) {
                isSingleColumn = false;
              }

              return (
                <div className="table-scroll-wrapper my-4">
                  <table
                    className={`w-full border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden ${isSingleColumn ? '' : 'md:min-w-[500px]'}`}
                    {...props}
                  >
                    {children}
                  </table>
                </div>
              );
            },
            thead: ({ node, ...props }) => (
              <thead className="bg-zinc-100 dark:bg-zinc-900" {...props} />
            ),
            tbody: ({ node, ...props }) => (
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950" {...props} />
            ),
            tr: ({ node, children, ...props }) => {
              // Check if this row is just a horizontal divider
              const isDividerRow = React.Children.toArray(children).some((child) => {
                if (React.isValidElement(child) && child.props.children) {
                  const content = React.Children.toArray(child.props.children)[0];
                  return (
                    typeof content === "string" && /^[\u2500-\u257F-=]+$/.test(content.trim())
                  );
                }
                return false;
              });

              if (isDividerRow) return null;

              return <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors" {...props}>{children}</tr>;
            },
            th: ({ node, ...props }) => (
              <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider" {...props} />
            ),
            td: ({ node, children, ...props }) => {
              const hasLongUnbreakableWord = React.Children.toArray(children).some(
                (child) =>
                  typeof child === "string" &&
                  child.split(" ").some((word) => word.length > 30)
              );

              // Check if content looks like a number or percentage
              const textContent = React.Children.toArray(children).map(c => String(c)).join('');
              const looksLikeNumber = /^[\d€$%+\-.,\s]+$/.test(textContent.trim());

              if (hasAnalysisMarker(children)) {
                return (
                  <td
                    className={cn(
                      "px-3 py-2 sm:px-4 sm:py-3 text-sm text-zinc-700 dark:text-zinc-300",
                      hasLongUnbreakableWord ? "break-all" : "break-words",
                      looksLikeNumber && "md-mono text-right"
                    )}
                    {...props}
                  >
                    <AnalysisHighlight>{children}</AnalysisHighlight>
                  </td>
                );
              }

              return (
                <td
                  className={cn(
                    "px-3 py-2 sm:px-4 sm:py-3 text-sm text-zinc-700 dark:text-zinc-300",
                    hasLongUnbreakableWord ? "break-all" : "break-words",
                    looksLikeNumber && "md-mono text-right"
                  )}
                  {...props}
                >
                  {children}
                </td>
              );
            },
            // Strong and emphasis - White for strong, italic for em
            strong: ({ node, ...props }) => (
              <strong className="font-medium text-gray-900 dark:text-white" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="italic text-gray-600 dark:text-zinc-300" {...props} />
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
