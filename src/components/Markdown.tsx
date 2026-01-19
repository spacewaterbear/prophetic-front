import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
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

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none px-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" style={{ fontFamily: 'EB Garamond, serif' }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100" style={{ fontFamily: 'EB Garamond, serif' }} {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" style={{ fontFamily: 'EB Garamond, serif' }} {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 text-gray-900 dark:text-gray-100" {...props} />
          ),
          h5: ({ node, ...props }) => (
            <h5 className="text-sm font-semibold mt-3 mb-2 text-gray-900 dark:text-gray-100" {...props} />
          ),
          h6: ({ node, ...props }) => (
            <h6 className="text-sm font-semibold mt-3 mb-2 text-gray-700 dark:text-gray-300" {...props} />
          ),
          // Paragraphs
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
                    className="font-mono whitespace-pre leading-tight mb-0"
                    {...props}
                  >
                    {children}
                  </p>
                </div>
              );
            }

            if (isHorizontalSeparator) {
              return (
                <div className="my-4 w-full max-w-full overflow-hidden">
                  <div className="border-t-2 border-gray-300 dark:border-gray-600" />
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
                          <p key={`text-${index}-${partIndex}`} className="mb-2 leading-relaxed overflow-hidden">
                            {textBuffer}
                          </p>
                        );
                        textBuffer = [];
                      }
                      // Add horizontal rule as a separate element
                      elements.push(
                        <hr key={`hr-${index}-${partIndex}`} className="my-2 border-gray-300 dark:border-gray-600" />
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
                  <p key="text-final" className="mb-2 leading-relaxed overflow-hidden">
                    {textBuffer}
                  </p>
                );
              }

              return <div className="mb-4">{elements}</div>;
            }

            return (
              <p className="leading-relaxed px-0" {...props}>
                {children}
              </p>
            );
          },
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          // Code
          code: ({ node, className, children, ...props }) => {
            // In react-markdown v10, the `inline` prop indicates if it's inline code
            const { inline } = props as { inline?: boolean };

            // Helper to check for ASCII table/box patterns in block code
            const content = String(children).trim();
            const isAsciiTable = !inline && (
              content.startsWith('┌') ||
              content.startsWith('╔') ||
              content.startsWith('┏') ||
              content.startsWith('+') ||
              content.startsWith('━') ||
              content.startsWith('─') ||
              (content.includes('│') && content.includes('─')) ||
              (content.includes('│') && content.includes('━')) ||
              (content.includes('├') || content.includes('┤') || content.includes('┼'))
            );

            if (inline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Custom styling for ASCII tables to make them look cleaner
            if (isAsciiTable) {
              return (
                <div className="table-scroll-wrapper my-4">
                  <code
                    className="block bg-gray-50 dark:bg-gray-800/30 text-gray-900 dark:text-gray-100 text-sm whitespace-pre leading-tight p-3 rounded"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                    {...props}
                  >
                    {children}
                  </code>
                </div>
              );
            }

            // Standard block code styling
            return (
              <code
                className="block bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, children, ...props }) => {
            // Check if the content is an ASCII table to remove the background styling
            // We need to peek into the children (usually a code element)
            const firstChild = React.Children.toArray(children)[0];
            let isAsciiTable = false;

            if (React.isValidElement(firstChild) && firstChild.props.children) {
              const content = String(firstChild.props.children).trim();
              isAsciiTable =
                content.startsWith('┌') ||
                content.startsWith('╔') ||
                content.startsWith('┏') ||
                content.startsWith('+') ||
                content.startsWith('━') ||
                content.startsWith('─') ||
                (content.includes('│') && content.includes('─')) ||
                (content.includes('│') && content.includes('━')) ||
                (content.includes('├') || content.includes('┤') || content.includes('┼'));
            }

            return (
              <pre
                className={cn(
                  "overflow-hidden my-4 block",
                  // Different styling for ASCII tables vs regular code blocks
                  isAsciiTable
                    ? "bg-gray-50 dark:bg-gray-800/30 rounded"
                    : "bg-gray-100 dark:bg-gray-900 rounded-lg"
                )}
                {...props}
              >
                {children}
              </pre>
            );
          },
          // Blockquote
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-300 bg-blue-50/50 dark:bg-blue-900/20"
              {...props}
            />
          ),
          // Links
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
          ),
          // Tables
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
                  className={`w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600 ${isSingleColumn ? '' : 'min-w-[500px]'}`}
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ node, ...props }) => (
            <thead className="bg-[rgb(235,225,215)] dark:bg-gray-800" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-[rgb(242,235,225)] dark:bg-gray-900" {...props} />
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

            return <tr {...props}>{children}</tr>;
          },
          th: ({ node, ...props }) => (
            <th className="px-2 py-1 sm:px-4 sm:py-2 text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100" {...props} />
          ),
          td: ({ node, children, ...props }) => {
            const hasLongUnbreakableWord = React.Children.toArray(children).some(
              (child) =>
                typeof child === "string" &&
                child.split(" ").some((word) => word.length > 30)
            );

            return (
              <td
                className={cn(
                  "px-2 py-1 sm:px-4 sm:py-2 text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300",
                  hasLongUnbreakableWord ? "break-all" : "break-words"
                )}
                {...props}
              >
                {children}
              </td>
            );
          },
          // Strong and emphasis
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
