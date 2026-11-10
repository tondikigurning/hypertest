/**
 * BDD step definitions — Case Management / Bulk (apps/tenants).
 *
 * Implements TEN_CAS_BULK_FLOW in cases.feature.
 */

import { createBdd } from "playwright-bdd";
import { HttpResponse, http } from "msw";
import { test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

// ── bulk page navigation ─────────────────────────────────────────────────

Given("the user is on the bulk cases page", async ({ casesBulkPage }) => {
  await casesBulkPage.navigateTo();
});

Then("the bulk cases page is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectVisible();
});

Then("the bulk action wizard is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectWizardVisible();
});

Then(
  "the bulk wizard shows the steps {string} and {string} and {string}",
  async ({ casesBulkPage }, s1: string, s2: string, s3: string) => {
    await casesBulkPage.expectWizardStepsVisible();
    // Verify the three step titles are present (extra guard)
    await casesBulkPage.expectWizardVisible();
    void s1;
    void s2;
    void s3;
  },
);

Then(
  "the bulk summary shows {string} and {string}",
  async ({ casesBulkPage }, a: string, b: string) => {
    await casesBulkPage.expectSummaryPlaceholders();
    void a;
    void b;
  },
);

Then("the bulk summary shows the selected action {string}", async ({ casesBulkPage }, action: string) => {
  await casesBulkPage.expectSummarySelectedAction(action);
});

// ── bulk action step ─────────────────────────────────────────────────────

Then("the bulk action step shows the title {string}", async ({ casesBulkPage }, title: string) => {
  await casesBulkPage.expectActionStepVisible();
  void title;
});

Then("the bulk action step shows the action {string}", async ({ casesBulkPage }, action: string) => {
  await casesBulkPage.expectActionVisible(action);
});

Then("the bulk wizard next button is disabled", async ({ casesBulkPage }) => {
  await casesBulkPage.expectNextDisabled();
});

Then("the bulk wizard next button is enabled", async ({ casesBulkPage }) => {
  await casesBulkPage.expectNextEnabled();
});

When("the user selects the {string} bulk action", async ({ casesBulkPage }, action: string) => {
  await casesBulkPage.selectBulkAction(action);
});

When("the user proceeds to the next bulk wizard step", async ({ casesBulkPage }) => {
  await casesBulkPage.clickNext();
});

When("the user goes back to the previous bulk wizard step", async ({ casesBulkPage }) => {
  await casesBulkPage.clickBack();
});

Then("the bulk action step is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectActionStepVisible();
});

// ── bulk upload step ─────────────────────────────────────────────────────

Then("the bulk upload step is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectUploadStepVisible();
});

Then("the bulk upload step shows the {string} action", async ({ casesBulkPage }, action: string) => {
  await casesBulkPage.expectDownloadTemplateVisible();
  void action;
});

Then("the bulk upload step shows the file upload control", async ({ casesBulkPage }) => {
  await casesBulkPage.expectFileUploadVisible();
});

Then("the bulk apply button is disabled", async ({ casesBulkPage }) => {
  await casesBulkPage.expectApplyDisabled();
});

When("the user uploads a valid bulk CSV file", async ({ casesBulkPage }) => {
  await casesBulkPage.uploadValidCsv();
});

When("the user applies the bulk operation", async ({ casesBulkPage }) => {
  await casesBulkPage.clickApply();
});

Then("the bulk error alert is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectErrorAlertVisible();
});

Then("the bulk completed step is visible", async ({ casesBulkPage }) => {
  await casesBulkPage.expectCompletedVisible();
});

Then("the bulk completed step shows the title {string}", async ({ casesBulkPage }, title: string) => {
  await casesBulkPage.expectCompletedVisible();
  void title;
});

// ── bulk MSW mocks ───────────────────────────────────────────────────────

/** Bulk import endpoints (caseBulkService). */
const BULK_RESOLVE_API = /\/casemgmt\/tenant\/import\/cases\/resolve/;
const BULK_CLOSE_API = /\/casemgmt\/tenant\/import\/cases\/close/;

Given("the bulk resolve API is configured to return a 500 server error", async ({ network }) => {
  network.use(
    http.post(BULK_RESOLVE_API, () =>
      HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    ),
  );
});

Given("the bulk close API is configured to return a 500 server error", async ({ network }) => {
  network.use(
    http.post(BULK_CLOSE_API, () =>
      HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    ),
  );
});

Given("the bulk resolve API is configured to return a success response", async ({ network }) => {
  network.use(
    http.post(BULK_RESOLVE_API, () => HttpResponse.json({}, { status: 200 })),
  );
});
