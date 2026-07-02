"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none leading-relaxed text-text-secondary ${className}`}
      dir="auto"
    >
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
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <pre className="bg-surface/50 border border-border rounded-xl p-4 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                className="bg-surface/50 rounded px-1.5 py-0.5 text-sm text-primary"
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }: any) => (
            <blockquote className="border-r-4 border-primary/30 pr-4 py-2 my-2 text-text-secondary bg-primary/5 rounded-r-xl">
              {children}
            </blockquote>
          ),
          a: ({ href, children }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }: any) => (
            <ul className="space-y-1 mr-4">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="space-y-1 mr-4 list-decimal">{children}</ol>
          ),
          li: ({ children }: any) => (
            <li className="text-text-secondary">{children}</li>
          ),
          h1: ({ children }: any) => (
            <h1 className="text-xl font-bold text-text-primary mt-6 mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-lg font-bold text-text-primary mt-5 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-base font-bold text-text-primary mt-4 mb-2">
              {children}
            </h3>
          ),
        } as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}