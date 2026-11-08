import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders a validation report with the dashboard's dark-panel styling. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-white/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: () => null,
          h2: ({ children }) => (
            <h3 className="mb-3 mt-8 text-lg text-white first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => <h4 className="mb-2 mt-6 text-base text-white">{children}</h4>,
          p: ({ children }) => <p className="mb-3">{children}</p>,
          strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
          code: ({ children, className }) =>
            className ? (
              <code className="font-mono text-xs">{children}</code>
            ) : (
              <code className="break-all rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-white">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="db-scroll mb-4 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs leading-relaxed">
              {children}
            </pre>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-4"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="db-scroll mb-4 overflow-x-auto">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 py-2 pr-4 font-normal uppercase tracking-wider text-white/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/5 py-2 pr-4 align-top">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
