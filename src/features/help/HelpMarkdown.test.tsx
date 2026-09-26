import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { expect, test } from "vitest";
import { HelpMarkdown, helpUrlTransform } from "./HelpMarkdown";

function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderMarkdown(source: string) {
  return render(
    <MemoryRouter initialEntries={["/help"]}>
      <HelpMarkdown source={source} />
      <Location />
    </MemoryRouter>,
  );
}

test("見出しの階層とリンクを本文の構文木から生成する", () => {
  const source = [
    "### 先頭の小見出し",
    "## **日本語**と `code`",
    "### [説明](https://example.test)と補足",
    "## 日本語と code",
    "## 日本語と code-2",
    "## !!!",
    "### ???",
    "#### 目次に含めない",
    "```markdown",
    "## コード内の見出し",
    "```",
  ].join("\n\n");
  const { container } = renderMarkdown(source);
  const toc = screen.getByRole("navigation", { name: "目次" });
  const links = within(toc).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual([
    "先頭の小見出し",
    "日本語と code",
    "説明と補足",
    "日本語と code",
    "日本語と code-2",
    "!!!",
    "???",
  ]);
  const headings = container.querySelectorAll("article h2, article h3");
  const ids = Array.from(headings, (heading) => heading.id);
  expect(ids).toEqual([
    "help-先頭の小見出し",
    "help-日本語と-code",
    "help-説明と補足",
    "help-日本語と-code-2",
    "help-日本語と-code-2-2",
    "help-section",
    "help-section-2",
  ]);
  expect(new Set(ids).size).toBe(headings.length);
  for (const [index, link] of links.entries()) {
    expect(link).toHaveAttribute(
      "href",
      `/help?${new URLSearchParams({ section: ids[index] })}`,
    );
    expect(headings[index]).toHaveAttribute("tabindex", "-1");
  }
  const parent = links[1].closest("li")!;
  expect(
    within(parent).getByRole("link", { name: "説明と補足" }),
  ).toBeInTheDocument();
  expect(within(toc).queryByText("目次に含めない")).not.toBeInTheDocument();
  expect(within(toc).queryByText("コード内の見出し")).not.toBeInTheDocument();
});

test("見出しの追加・並べ替え・削除に目次が追従し、対象がなければ非表示にする", () => {
  const { rerender } = renderMarkdown("## 最初\n\n### 補足\n\n## 次");
  const renderSource = (source: string) =>
    rerender(
      <MemoryRouter>
        <HelpMarkdown source={source} />
      </MemoryRouter>,
    );
  renderSource("## 次\n\n## 追加\n\n### 補足");
  expect(
    within(screen.getByRole("navigation", { name: "目次" }))
      .getAllByRole("link")
      .map((link) => link.textContent),
  ).toEqual(["次", "追加", "補足"]);
  renderSource("#### 詳細だけ\n\n本文");
  expect(
    screen.queryByRole("navigation", { name: "目次" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("本文")).toBeInTheDocument();
});

test("h3だけでも目次を表示し、すべての見出しでIDの衝突を避ける", () => {
  renderMarkdown("#### 同じ\n\n### 同じ\n\n### 同じ");
  const toc = screen.getByRole("navigation", { name: "目次" });
  expect(within(toc).getAllByRole("link")).toHaveLength(2);
  expect(screen.getAllByRole("heading").map((heading) => heading.id)).toEqual([
    "help-同じ",
    "help-同じ-2",
    "help-同じ-3",
  ]);
});

test("本文内の節リンクと育成計画リンクはルーターを使い、外部リンクは維持する", async () => {
  const user = userEvent.setup();
  renderMarkdown(
    "## 説明\n\n[節へ](#help-説明) [エンコード済み](#help-%E8%AA%AC%E6%98%8E) [外部](https://example.test/path#id) [戻る](/)",
  );
  expect(screen.getByRole("link", { name: "外部" })).toHaveAttribute(
    "href",
    "https://example.test/path#id",
  );
  const expected = `/help?${new URLSearchParams({ section: "help-説明" })}`;
  expect(screen.getByRole("link", { name: "エンコード済み" })).toHaveAttribute(
    "href",
    expected,
  );
  await user.click(screen.getByRole("link", { name: "節へ" }));
  expect(screen.getByTestId("location")).toHaveTextContent(expected);
  await user.click(screen.getByRole("link", { name: "戻る" }));
  expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
});

test("標準Markdownと表・画像を表示し、生HTMLを表示しない", () => {
  renderMarkdown(`## 本文

**強調**と *斜体*

- 項目

> 引用

~~~text
コード
~~~

| 項目 | 値 |
| --- | --- |
| HP | 30 |

![画面例](./images/editor-example.png)

<button>生HTML</button>
`);
  expect(screen.getByText("強調").tagName).toBe("STRONG");
  expect(screen.getByText("斜体").tagName).toBe("EM");
  expect(screen.getByRole("table")).toHaveTextContent("HP30");
  expect(screen.getByRole("img", { name: "画面例" })).toHaveAttribute(
    "src",
    "/help/images/editor-example.png",
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test.each(["/", "/ddda-stat-tuner/"])(
  "画像URLをベースパス %s で解決する",
  (base) => {
    expect(helpUrlTransform("./images/new.png", "src", base)).toBe(
      `${base}help/images/new.png`,
    );
    expect(
      helpUrlTransform("https://example.test/image.png", "src", base),
    ).toBe("https://example.test/image.png");
    expect(helpUrlTransform("#help-説明", "href", base)).toBe("#help-説明");
    expect(helpUrlTransform("javascript:alert(1)", "href", base)).toBe("");
  },
);
