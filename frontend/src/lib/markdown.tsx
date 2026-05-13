import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  // Wrap the table in a scroll container so wide tool results stay inside the chat bubble
  // (the drawer is max-w-md / 28rem — anything wider would bleed off-screen otherwise).
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded border border-line">
      <table className="w-max min-w-full border-collapse font-mono text-[11px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-bg-elev-2 text-text-dim">{children}</thead>
  ),
  tr: ({ children }) => <tr className="border-b border-line/60 last:border-b-0">{children}</tr>,
  th: ({ children }) => (
    <th className="whitespace-nowrap px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-dim">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="whitespace-nowrap px-2 py-1 align-top text-text">{children}</td>
  ),
  code: ({ children }) => (
    <code className="rounded-sm border border-line bg-bg px-1 py-0.5 font-mono text-[11px] text-cyan">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded border border-line bg-bg p-2 font-mono text-[11px] text-text">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="my-1 list-disc pl-5 text-text">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal pl-5 text-text">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-text-bright">{children}</strong>,
};

export function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
