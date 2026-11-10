import type { TestCase } from "@playwright/test/reporter";

interface SuiteLike {
  title?: string;
  parent?: SuiteLike;
}

const EXAMPLE_TITLE_RE = /^Example #\d+$/;
const FILE_SUITE_TITLE_RE = /\.spec\.(js|ts|cjs|mjs)$/i;

/** Playwright file/project suites use paths as titles — not Gherkin features. */
export function isFileSuiteTitle(title: string): boolean {
  return FILE_SUITE_TITLE_RE.test(title) || title.includes("\\") || title.includes("/");
}

/**
 * Collects describe-block titles from the test up to (but not including) the file suite.
 * Outermost entry is the Gherkin Feature title (meta.category).
 */
export function collectDescribeTitles(test: TestCase): Array<string> {
  const titles: Array<string> = [];
  let suite: SuiteLike | undefined = (test as unknown as { parent?: SuiteLike }).parent;

  while (suite?.title && !isFileSuiteTitle(suite.title)) {
    titles.unshift(suite.title);
    suite = suite.parent;
  }

  return titles;
}

/**
 * playwright-bdd nests Scenario Outlines as an inner describe; Examples use titles like "Example #1".
 * Feature title → category; scenario / outline title → title.
 */
export function resolveBddScenarioMeta(test: TestCase): { category: string; title: string } {
  const describes = collectDescribeTitles(test);
  const category = (describes[0] ?? "Unknown Feature").replace(/^Feature:\s*/i, "").trim() || "Unknown Feature";

  let title = test.title;
  if (EXAMPLE_TITLE_RE.test(title)) {
    title = describes.at(-1) ?? title;
  }

  return { category, title };
}
