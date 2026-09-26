import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router";
import { rehypeHelpLayout, remarkHelpHeadings } from "./markdownHeadings";

function sectionLink(href: string): string {
  let id = href.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A manually edited fragment may contain a literal percent sign.
  }
  return `/help?${new URLSearchParams({ section: id })}`;
}

const components: Components = {
  a({ href, children, title }) {
    if (href?.startsWith("#")) {
      return (
        <Link to={sectionLink(href)} title={title}>
          {children}
        </Link>
      );
    }
    if (href?.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link to={href} title={title}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} title={title}>
        {children}
      </a>
    );
  },
  img({ src, alt, title }) {
    const example = src?.endsWith("/help/images/editor-example.png");
    return (
      <img
        src={src}
        alt={alt ?? ""}
        title={title}
        width={example ? 1120 : undefined}
        height={example ? 1080 : undefined}
      />
    );
  },
  table({ children }) {
    return (
      <div className="help-table-scroll">
        <table>{children}</table>
      </div>
    );
  },
};

export function helpUrlTransform(url: string, key: string, baseUrl: string) {
  const safeUrl = defaultUrlTransform(url);
  if (key === "src" && safeUrl.startsWith("./images/")) {
    return `${baseUrl}help/${safeUrl.slice(2)}`;
  }
  return safeUrl;
}

export function HelpMarkdown({ source }: { source: string }) {
  return (
    <div className="help-content">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkHelpHeadings]}
        rehypePlugins={[rehypeHelpLayout]}
        components={components}
        urlTransform={(url, key) =>
          helpUrlTransform(url, key, import.meta.env.BASE_URL)
        }
      >
        {source}
      </Markdown>
    </div>
  );
}
