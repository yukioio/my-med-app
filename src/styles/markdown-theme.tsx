import React from "react";
import { splitCellTextToList } from "@/src/lib/utils";

export const markdownStyle = `
.prose {
  line-height: 1.92 !important;
  font-size: 1.08rem;
  color: #1e293b;
  word-break: break-word;
}
.prose :where(p, ul, ol, blockquote, pre, table) {
  margin-bottom: 1.42em;
  margin-top: 1.18em;
}
.prose :where(h1, h2, h3, h4) {
  margin-top: 2.0em;
  margin-bottom: 1.1em;
  line-height: 1.22;
}
.prose h1, .prose h2, .prose h3 {
  color: #1e3a8a;
  font-weight: 800;
}
.prose h1 { font-size: 2.25rem; }
.prose h2 { font-size: 1.65rem; }
.prose h3 { font-size: 1.3rem; }
.prose ul, .prose ol { margin-left: 1.5em; }
.prose strong { font-weight: 700; color: #334155; }
.prose code {
  font-size: 0.98em;
  background: #f5f7fa;
  padding: 0.19em 0.42em;
  border-radius: 0.35em;
  color: #7c3aed;
}
.prose pre {
  background: #f5f7fa;
  border-radius: 0.5em;
  padding: 1.1em 1.3em;
  font-size: 0.98em;
  overflow-x: auto;
}
.prose blockquote {
  border-left: 4px solid #60a5fa;
  background: #f0f7fa;
  color: #12406a;
  padding: .75em 1.5em;
  border-radius: 0 0.5em 0.5em 0;
  font-style: italic;
}
.prose hr {
  border: none;
  border-top: 1.2px solid #e4e4e7;
  margin: 2em 0;
}
/* === テーブル内の行間・パディング・文字 ここで制御 === */
.prose table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  background-color: #fff;
  margin-bottom: 2em;
  margin-top: 2em;
  font-size: 0.94em;
}
.prose thead {
  background-color: #f4f4f5;
}
.prose thead tr th {
  color: #1e293b;
  font-weight: 700;
  background-color: #f4f4f5;
  padding: 1.05em 1.1em;
  font-size: 0.95em;
  border-bottom: 2px solid #e4e4e7;
  line-height: 1.35;
}
.prose tbody tr {
  border-top: none !important;
}
.prose tbody tr:nth-child(even) {
  background-color: rgba(244,244,245,0.58);
}
.prose tbody td {
  border-top: 1px solid #e4e4e7;
  padding: 1.09em 1.2em;
  vertical-align: top;
  font-size: 0.89em;
  line-height: 1.4 !important;
}
.prose tbody td ul {
  padding-left: 1.1em;
  margin: 0.20em 0;
}
.prose tbody td li {
  margin: 0.10em 0;
  padding-left: 0.2em;
  font-size: 0.92em;
  line-height: 1.3 !important;
  list-style-type: disc;
  list-style-position: inside;
}
`;

export const markdownComponents: Record<string, React.ComponentType<any>> = {
  code({ node, inline, className, children, ...props }: any) {
    return (
      <code
        className="font-mono px-1 py-0.5 rounded bg-[#f3f1fc] text-[#6d28d9] text-[.98em]"
        style={{
          background: "#f3f1fc",
          color: "#6d28d9",
          borderRadius: "0.35em",
          fontSize: "0.96em",
          padding: "0.15em 0.32em",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ node, ...props }: any) {
    return (
      <pre
        className="bg-[#eff6fb] border border-[#bae6fd] p-4 rounded-lg my-3 overflow-x-auto"
        {...props}
      />
    );
  },
  blockquote({ node, ...props }: any) {
    return (
      <blockquote
        className="border-l-4 border-blue-400 bg-[#f0f7fa] text-blue-900 font-normal pl-4 py-2 my-2"
        style={{ fontStyle: "italic" }}
        {...props}
      />
    );
  },
  table({ node, ...props }: any) {
    return (
      <table
        className="border rounded-lg overflow-hidden"
        style={{ fontSize: "0.95em" }}
        {...props}
      />
    );
  },
  thead({ node, ...props }: any) {
    return <thead className="bg-zinc-50" {...props} />;
  },
  th({ node, ...props }: any) {
    return (
      <th
        className="p-3 font-semibold border-b bg-zinc-100"
        style={{ fontSize: "0.93em", lineHeight: "1.36" }}
        {...props}
      />
    );
  },
  td({ node, children, ...props }: any) {
    let raw = "";
    if (typeof children === "string") {
      raw = children;
    } else if (
      Array.isArray(children) &&
      children.length === 1 &&
      typeof children[0] === "string"
    ) {
      raw = children[0];
    } else if (
      Array.isArray(children) &&
      children.length >= 1 &&
      Array.isArray(children[0]?.props?.children)
    ) {
      raw = children
        .map((c: any) =>
          typeof c === "string"
            ? c
            : typeof c?.props?.children === "string"
            ? c.props.children
            : Array.isArray(c?.props?.children)
            ? c.props.children.join("")
            : ""
        )
        .join("");
    }
    const useList = splitCellTextToList(raw);

    return (
      <td
        className="p-3 border-b"
        style={{
          fontSize: "0.89em",
          lineHeight: "1.4",
          verticalAlign: "top",
          paddingTop: "1.09em",
          paddingBottom: "1.09em",
        }}
        {...props}
      >
        {useList || children}
      </td>
    );
  },
  ul({ node, ...props }: any) {
    return <ul className="list-disc ml-6 my-2" {...props} />;
  },
  ol({ node, ...props }: any) {
    return <ol className="list-decimal ml-6 my-2" {...props} />;
  },
  hr({ node, ...props }: any) {
    return <hr className="border-t border-blue-200 my-8" {...props} />;
  },
  a({ node, ...props }: any) {
    return (
      <a
        {...props}
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  strong({ node, ...props }: any) {
    return <strong className="text-[#334155] font-bold" {...props} />;
  },
  p({ node, ...props }: any) {
    return <p className="mb-3" {...props} />;
  },
};
