import type { TestCase } from "@playwright/test/reporter";
import { describe, expect, it } from "vitest";
import { collectDescribeTitles, isFileSuiteTitle, resolveBddScenarioMeta } from "./bdd-scenario-meta";

function mockTest(title: string, describeTitles: Array<string>, fileTitle = "pipeline.feature.spec.js"): TestCase {
  let parent: { title?: string; parent?: { title?: string } } = { title: fileTitle };

  for (const describeTitle of describeTitles) {
    parent = { title: describeTitle, parent };
  }

  return { title, parent } as unknown as TestCase;
}

describe("isFileSuiteTitle", () => {
  it("detects generated spec file suites", () => {
    expect(isFileSuiteTitle("pipeline.feature.spec.js")).toBe(true);
    expect(isFileSuiteTitle("tests/bdd/features/_components/pipeline.feature.spec.js")).toBe(true);
  });

  it("does not treat feature titles as file suites", () => {
    expect(isFileSuiteTitle("Pipeline Renderer — Component")).toBe(false);
    expect(isFileSuiteTitle("User Management — Users")).toBe(false);
  });
});

describe("collectDescribeTitles", () => {
  it("returns only Gherkin describe blocks for a scenario outline example", () => {
    const titles = collectDescribeTitles(
      mockTest("Example #5", ["Pipeline Renderer — Component", "Selecting a pipeline tab activates it"]),
    );

    expect(titles).toEqual(["Pipeline Renderer — Component", "Selecting a pipeline tab activates it"]);
  });

  it("returns the feature title for a plain scenario", () => {
    const titles = collectDescribeTitles(
      mockTest("Users list page loads with the data table visible", ["User Management — Users"]),
    );

    expect(titles).toEqual(["User Management — Users"]);
  });
});

describe("resolveBddScenarioMeta", () => {
  it("maps component master outline examples to feature category and scenario title", () => {
    const meta = resolveBddScenarioMeta(
      mockTest("Example #5", ["Pipeline Renderer — Component", "Selecting a pipeline tab activates it"]),
    );

    expect(meta).toEqual({
      category: "Pipeline Renderer — Component",
      title: "Selecting a pipeline tab activates it",
    });
  });

  it("maps submodule outline examples to submodule feature category and scenario title", () => {
    const meta = resolveBddScenarioMeta(
      mockTest("Example #5", [
        "User Management — Users",
        "Switching a pipeline tab filters the users list",
      ]),
    );

    expect(meta).toEqual({
      category: "User Management — Users",
      title: "Switching a pipeline tab filters the users list",
    });
  });

  it("maps plain scenarios directly", () => {
    const meta = resolveBddScenarioMeta(
      mockTest("Users list page loads with the data table visible", ["User Management — Users"]),
    );

    expect(meta).toEqual({
      category: "User Management — Users",
      title: "Users list page loads with the data table visible",
    });
  });
});
