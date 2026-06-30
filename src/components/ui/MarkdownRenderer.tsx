"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none leading-relaxed text-text-secondary ${className}`} dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
          math: ({ children }: any) => (
            <span className="text-primary font-medium" style={{ direction: "ltr" }}>
              {children}
            </span>
          ),
          inlineMath: ({ children }: any) => (
            <span className="text-primary font-medium" style={{ direction: "ltr" }}>
              {children}
            </span>
          ),
        } as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
