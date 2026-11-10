import { describe, expect, it } from "vitest";
import { parseFeatureFileCatalog } from "./feature-catalog";

const sample = `# Feature: User Authentication

@TEN_LOGIN_FLOW
Feature: User Authentication

  @TEN_AUTH_E2E_001 @smoke @flow:TEN_LOGIN_FLOW @type:positive
  Scenario Outline: Successful login with valid credentials
    Given the user is on the login page
    When the user submits valid credentials
    Then the user is redirected to the dashboard

    Examples:
      | role   |
      | admin  |
      | agent  |
`;

describe("parseFeatureFileCatalog", () => {
  it("extracts scenario metadata from a feature block", () => {
    const results = parseFeatureFileCatalog("authentication.feature", sample);
    expect(results).toHaveLength(1);
    expect(results[0]?.meta.id).toBe("TEN_AUTH_E2E_001");
    expect(results[0]?.meta.category).toBe("User Authentication");
    expect(results[0]?.meta.title).toBe("Successful login with valid credentials");
    expect(results[0]?.meta.expect).toBe("the user is redirected to the dashboard");
    expect(results[0]?.meta.scenario).toContain("Given the user is on the login page");
    expect(results[0]?.meta.scenario).toContain("Then the user is redirected to the dashboard");
    expect(results[0]?.meta.scenario).toContain("Example: role=admin");
    expect(results[0]?.meta.scenario).toContain("Example: role=agent");
    expect(results[0]?.meta.method).toBe("e2e");
    expect(results[0]?.meta.tags).toContain("smoke");
  });

  it("uses only the final assertion as the expected outcome", () => {
    const multiThen = `# Feature: Profanity Settings

@TEN_PRF_FTG_E2E_001 @smoke @flow:TEN_PRF_FILTER_TOGGLE_FLOW
Scenario: Toggle the filter
  Given the user is on the profanity settings page
  When the user toggles the profanity filter switch
  Then the profanity filter confirmation dialog is visible
  When the user confirms the profanity filter change
  Then the profanity filter success toast is shown
  And the profanity filter status matches the recorded status
`;
    const results = parseFeatureFileCatalog("profanity.feature", multiThen);

    expect(results[0]?.meta.expect).toBe("the profanity filter status matches the recorded status");
  });
});
