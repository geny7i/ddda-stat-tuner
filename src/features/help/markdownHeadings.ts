import type { Root as MarkdownRoot } from "mdast";
import type { Element, ElementContent, Root as HtmlRoot } from "hast";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

type HelpHeading = { id: string; text: string; depth: 2 | 3 };
type MarkdownFile = { data: Record<string, unknown> };

// Keep the TOC on the same file that react-markdown uses to render the body.
export function remarkHelpHeadings() {
  return (tree: MarkdownRoot, file: MarkdownFile) => {
    const headings: HelpHeading[] = [];
    const usedIds = new Set<string>();
    visit(tree, "heading", (heading) => {
      const text = toString(heading);
      const slug = text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .trim()
        .replace(/\s+/g, "-");
      const base = `help-${slug || "section"}`;
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) id = `${base}-${suffix++}`;
      usedIds.add(id);
      heading.data = {
        ...heading.data,
        hProperties: { ...heading.data?.hProperties, id, tabIndex: -1 },
      };
      if (heading.depth === 2 || heading.depth === 3) {
        headings.push({ id, text, depth: heading.depth });
      }
    });
    file.data.helpHeadings = headings;
  };
}

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

export function rehypeHelpLayout() {
  return (tree: HtmlRoot, file: MarkdownFile) => {
    const headings = file.data.helpHeadings as HelpHeading[];
    const article = element(
      "article",
      tree.children.filter((node) => node.type !== "doctype"),
      { className: ["help-body"] },
    );
    if (!headings.length) {
      tree.children = [article];
      return;
    }

    const items: Element[] = [];
    let parent: Element | undefined;
    let sublist: Element | undefined;
    for (const heading of headings) {
      const item = element("li", [
        element("a", [{ type: "text", value: heading.text || "（見出し）" }], {
          href: `#${heading.id}`,
        }),
      ]);
      if (heading.depth === 3 && parent) {
        if (!sublist) {
          sublist = element("ul", []);
          parent.children.push(sublist);
        }
        sublist.children.push(item);
      } else {
        items.push(item);
        parent = heading.depth === 2 ? item : undefined;
        sublist = undefined;
      }
    }
    tree.children = [
      element(
        "nav",
        [
          element("p", [{ type: "text", value: "目次" }], {
            className: ["help-toc-title"],
          }),
          element("ul", items),
        ],
        { ariaLabel: "目次", className: ["help-toc"] },
      ),
      article,
    ];
  };
}
