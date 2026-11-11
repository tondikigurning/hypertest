# Browser-assisted test authoring

This reference describes browser mechanics. Project authoring policy and the user's requested scope decide the deliverable.

For `e2e` BDD, apply [write-e2e-scenarios](../../write-e2e-scenarios/SKILL.md) for discovery and Gherkin, then [write-e2e-code](../../write-e2e-code/SKILL.md) for approved scenarios. Keep its flow-list confirmation, scenario review, stable IDs and data-safety rules. Browser exploration does not approve scenarios. Do not create a parallel standalone `.spec.ts` suite, seed test or separate plan unless requested and appropriate to the target project.

For other browser-test scopes, inspect their existing runner, fixtures, test files and project conventions first. Use existing setup; introduce new setup only when it is necessary and within the request. Check installed commands and versions with local help rather than assuming a particular debug/attach capability. See [playwright-tests.md](playwright-tests.md).

## Explore and capture evidence

1. Establish the target environment and inspect data-safety requirements before a live interaction. Use a named session you own and reuse its relevant authentication setup.
2. Snapshot the page, verify current roles, labels and locators, and record user-visible actions and outcomes. Inspect requests when needed, avoiding disclosure of credentials and sensitive data. Use tracing or screenshots where useful.
3. Treat observed behavior as evidence, not automatically as the intended requirement. If it conflicts with an approved spec or known requirement, preserve the spec and report expected versus actual. Resolve uncertain intent with the user before changing assertions or scenario meaning.
4. CLI output may offer locator and action code. Review and adapt it to the existing POM, component and fixture boundaries. Generated actions need meaningful assertions of the intended observable outcome. Preserve existing IDs and shared steps.

## Implement and verify

Follow the relevant specialist skill and approved scope. Reuse existing steps, fixtures and page objects; avoid generating one test per file as a blanket rule. Assert the state or outcome the scenario promises; a mocked HTTP response alone does not demonstrate visible UI feedback. Use response probes as supporting evidence when appropriate.

For a technical repair, reproduce the failure and distinguish locator/setup changes from product defects. Preserve approved behavior; a changed journey goes through the applicable review workflow. Run a focused, safe selection, report passes, failures and skips, and inspect result and evidence artifacts. Close only the sessions and processes you started.
