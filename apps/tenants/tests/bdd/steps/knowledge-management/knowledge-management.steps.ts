/**
 * BDD steps — Knowledge Management (knowledge-management.feature).
 *
 * Reuses the shared pipeline / filter / sort / view-detail steps (registered through the
 * page-context resolver) for the LIST / VIEW_DETAIL flows, and defines module-specific
 * steps here for create, edit, delete, submit-for-approval, approval and publish.
 *
 * Auth via storageState (tests/bdd/setup/auth.setup.ts → converge.stt.hyperscal.com).
 */
import type { TestInfo } from "@playwright/test";
import { http, HttpResponse } from "msw";
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import { ensureListResponseTracking, armListResponseProbe, registerListFilterHandler } from "../../utils/list-page-network-utils";
import {
    KNOWLEDGE_MANAGEMENT_CREATE_API,
    KNOWLEDGE_MANAGEMENT_DELETE_API,
    KNOWLEDGE_MANAGEMENT_LIST_PATH,
    KNOWLEDGE_MANAGEMENT_PUBLISH_API,
    KNOWLEDGE_MANAGEMENT_REQUEST_REVISION_API,
    KNOWLEDGE_MANAGEMENT_SUBMIT_APPROVAL_API,
    KNOWLEDGE_MANAGEMENT_UPDATE_API,
} from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

// ─── Navigation Givens ───────────────────────────────────────────────────

Given("the user is on the knowledge management list page", async ({ pageContext, knowledgeManagementPage }) => {
    pageContext.setCurrentPage("knowledge-management");
    pageContext.setListSurface("list");
    await knowledgeManagementPage.navigateTo();
});

Given("the user is on the create knowledge article page", async ({ pageContext, knowledgeManagementPage }) => {
    pageContext.setCurrentPage("knowledge-management");
    pageContext.setListSurface("list");
    await knowledgeManagementPage.clickCreate();
});

When("the user navigates to the knowledge management list page", async ({ page, pageContext, knowledgeManagementPage }) => {
    pageContext.setCurrentPage("knowledge-management");
    pageContext.setListSurface("list");
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await page.goto(KNOWLEDGE_MANAGEMENT_LIST_PATH, { waitUntil: "domcontentloaded" });
});

// ─── Token-expiry (401) ──────────────────────────────────────────────────

Given("the knowledge management list API is configured to return a 401 authentication error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("knowledge-management");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
    );
});

// ─── Create wizard ───────────────────────────────────────────────────────

When("the user clicks the create knowledge article button", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.clickCreate();
});

When("the user fills the knowledge article details", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Enter article name");
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(`E2E KM Article ${Date.now()}`);

    // Entity / CTS Category are Dropdown fields: the trigger is a <button> whose visible text is
    // the placeholder ("Choose Entity" / "CTS Category") — there is no placeholder <input>, and the
    // options render as role="menuitem" inside a Radix menu (not role="option"). Locate the trigger
    // by its visible text (data-field-name is not emitted to the DOM by form.Field).
    const entityTrigger = page.locator('button', { hasText: "Choose Entity" }).first();
    await entityTrigger.click();
    // Hanya SKY-entity / Converge yang punya data di CTS Category; pilih salah satu agar
    // tombol Next bisa lanjut (Arch Team / iruhadev tidak punya data CTS Category).
    const firstEntity = page.getByRole("menuitem", { name: /SKY-entity|Converge/i }).first();
    await expect(firstEntity).toBeVisible({ timeout: 15_000 });
    await firstEntity.click();

    // CTS Category depends on Entity — wait until enabled, then pick the first option.
    const ctsTrigger = page.locator('button', { hasText: "CTS Category" }).first();
    await expect(ctsTrigger).toBeEnabled({ timeout: 15_000 });
    await ctsTrigger.click();
    const firstCts = page.getByRole("menuitem").first();
    await expect(firstCts).toBeVisible({ timeout: 15_000 });
    await firstCts.click();

    const description = page.getByPlaceholder("Enter article description");
    if (await description.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await description.fill("E2E automated article description.");
    }
});

When("the user fills the knowledge article content", async ({ page }) => {
    const editor =
        page.locator('[contenteditable="true"]').first()
            .or(page.getByPlaceholder("Enter your knowledge article content here..."));
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await editor.fill("E2E automated article body content.");
});

When("the user advances to the content step", async ({ page }) => {
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByPlaceholder("Enter your knowledge article content here...").or(page.locator('[contenteditable="true"]').first())).toBeVisible({ timeout: 15_000 });
});

When("the user advances to the knowledge article summary step", async ({ page }) => {
    await page.getByRole("button", { name: "Next" }).click();
});

When("the user submits the knowledge article creation", async ({ page }) => {
    // Summary is the next-to-last step → its footer button is "Next", which triggers creation
    // and advances to the Completed (success) step.
    const nextBtn = page.getByRole("button", { name: "Next" });
    await expect(nextBtn).toBeVisible({ timeout: 10_000 });
    await nextBtn.click();
});

/**
 * Composite Given — drives the full create wizard (Details → Content → Summary → submit) and
 * returns to the list, leaving a freshly created DRAFT article as the first row (list is sorted
 * by created_at DESC). Lifecycle flows (edit / approval / delete) reuse this so they no longer
 * depend on pre-existing seed data being in a specific status.
 */
Given("the user has created a knowledge article", async ({ page, knowledgeManagementPage, pageContext }) => {
    await knowledgeManagementPage.navigateTo();
    await knowledgeManagementPage.clickCreate();
    await expect(page).toHaveURL(/\/knowledge-management\/create/, { timeout: 30_000 });

    const articleName = `E2E KM Article ${Date.now()}`;
    pageContext.setCreatedArticleName(articleName);
    const nameInput = page.getByPlaceholder("Enter article name");
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill(articleName);

    // Entity / CTS Category are Dropdown fields — trigger is a <button> whose visible text is the
    // placeholder; options are role="menuitem". Only SKY-entity / Converge have CTS Category data.
    const entityTrigger = page.locator('button', { hasText: "Choose Entity" }).first();
    await entityTrigger.click();
    const firstEntity = page.getByRole("menuitem", { name: /SKY-entity|Converge/i }).first();
    await expect(firstEntity).toBeVisible({ timeout: 15_000 });
    await firstEntity.click();

    const ctsTrigger = page.locator('button', { hasText: "CTS Category" }).first();
    await expect(ctsTrigger).toBeEnabled({ timeout: 15_000 });
    await ctsTrigger.click();
    const firstCts = page.getByRole("menuitem").first();
    await expect(firstCts).toBeVisible({ timeout: 15_000 });
    await firstCts.click();

    const description = page.getByPlaceholder("Enter article description");
    if (await description.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await description.fill("E2E automated article description.");
    }

    // Details → Content step (the RichText editor lives on the Content step, so we must
    // advance past Details first).
    await page.getByRole("button", { name: "Next" }).click();

    const editor = page.locator('[contenteditable="true"]').first()
        .or(page.getByPlaceholder("Enter your knowledge article content here..."));
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await editor.fill("E2E automated article body content.");

    // Content → Summary step.
    await page.getByRole("button", { name: "Next" }).click();

    // Summary → submit (creates the DRAFT article, advances to the Completed step).
    const submitBtn = page.getByRole("button", { name: "Next" });
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
    await submitBtn.click();

    await expect(page.getByText(/New Article has been successfully created/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Ok, Back to Homepage" }).click();
    await page.waitForURL(/\/knowledge-management/);

    // Scope the list to the Draft pipeline tab (the created article is DRAFT) so the first row is
    // reliably the freshly created article, then wait for it to render. Without this the list is
    // still loading on return and the next step sees 0 rows and skips the whole scenario.
    await knowledgeManagementPage.selectPipelineTab("Draft");
    await expect(
        knowledgeManagementPage.table.rows.filter({ hasText: articleName }).first(),
    ).toBeVisible({ timeout: 30_000 });
    pageContext.setCreatedArticleName(articleName);
});

When("the user cancels the knowledge article create wizard", async ({ page, knowledgeManagementPage }) => {
    // Locate by role/name — the module renders no data-testid attributes (see feature header),
    // and the Cancel button is the only one on the create wizard page.
    await page.getByRole("button", { name: "Cancel" }).click();
    await knowledgeManagementPage.expectLoaded();
});

When("the user navigates back from the create knowledge article wizard", async ({ page, knowledgeManagementPage }) => {
    await page.goBack();
    await knowledgeManagementPage.expectLoaded();
});

Then("the knowledge article creation success screen is displayed", async ({ page }) => {
    await expect(
        page.getByText(/New Article has been successfully created/i).first(),
    ).toBeVisible({ timeout: 20_000 });
});

When("the user returns to the knowledge management list from the create success screen", async ({ page, knowledgeManagementPage }) => {
    const backBtn = page.getByRole("button", { name: "Ok, Back to Homepage" });
    await expect(backBtn).toBeVisible({ timeout: 10_000 });
    await backBtn.click();
    await knowledgeManagementPage.expectLoaded();
});

Then("the created knowledge article is visible in the list", async ({ knowledgeManagementPage, pageContext }) => {
    const name = pageContext.createdArticleName;
    expect(name).toBeTruthy();
    await expect(
        knowledgeManagementPage.table.rows.filter({ hasText: name as string }).first(),
    ).toBeVisible({ timeout: 30_000 });
});

Then("the knowledge management list page is displayed", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectLoaded();
});

Then("the knowledge management data table is visible", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.table.expectVisible();
});

// ─── Row actions: open the kebab ─────────────────────────────────────────

When("the user opens the first knowledge article row actions menu", async ({ knowledgeManagementPage, $testInfo }) => {
    const rowCount = await knowledgeManagementPage.table.rows.count();
    if (rowCount === 0) {
        ($testInfo as TestInfo).skip(true, "No knowledge article rows in the list.");
    }
    await knowledgeManagementPage.openFirstRowActionsMenu();
});

When("the user clicks {string} from the knowledge article row actions menu", async ({ knowledgeManagementPage }, menuItemLabel: string) => {
    await knowledgeManagementPage.clickRowActionsMenuItem(menuItemLabel);
});

When("the user clicks Publish from an available knowledge article row actions menu", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.clickPublishOnAvailableRow();
});

// ─── Edit flow ───────────────────────────────────────────────────────────

When("the user clicks Edit from the knowledge article row actions menu", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.clickRowActionsMenuItem("Edit");
    await knowledgeManagementPage.expectEditDialogVisible();
});

When("the user updates the knowledge article name and description", async ({ page }) => {
    const nameInput = page.getByPlaceholder("Enter article name");
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nameInput.fill(`E2E KM Article Edited ${Date.now()}`);
    }
    const description = page.getByPlaceholder("Enter article description");
    if (await description.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await description.fill("E2E edited description.");
    }
});

When("the user submits the edit knowledge article form", async ({ page }) => {
    await page.getByRole("button", { name: "Save" }).click();
});

When("the user cancels the edit knowledge article dialog", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectEditDialogVisible();
    await knowledgeManagementPage.cancelDialog("Update Article");
});

Then("the edit knowledge article dialog is not visible", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectEditDialogHidden();
});

// ─── Delete flow ─────────────────────────────────────────────────────────

When("the user confirms the knowledge article deletion", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.confirmDeleteArticle();
});

When("the user cancels the knowledge article deletion", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelDeleteArticle();
});

Then("the knowledge article delete confirmation dialog is not visible", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectDialogHidden("Delete Article");
});

// ─── Submit for approval flow ────────────────────────────────────────────

When("the user confirms the knowledge article submission for approval", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.confirmSubmitForApproval();
});

When("the user cancels the submit for approval dialog", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelSubmitForApproval();
});

Then("the submit for approval confirmation dialog is not visible", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectDialogHidden("Submit For Approval");
});

// ─── Approval flow (Pending Approval rows) ──────────────────────────────

When("the user approves the knowledge article from the approval dialog", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.approveArticleFromApprovalDialog();
});

When("the user requests revision from the approval dialog", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.requestRevisionFromApprovalDialog("E2E requested revision comment.");
});

When("the user cancels the approval dialog", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelApprovalDialog();
});

Then("the approval dialog is not visible", async ({ page }) => {
    // The "Approval" kebab item opens the "Submit For Approval" dialog (wiring is swapped in
    // knowledge-management.page.tsx), so assert neither approval-related dialog is visible.
    await expect(
        page.getByRole("dialog").filter({ hasText: /Approval Article|Publish Article|Submit For Approval/i }),
    ).not.toBeVisible({ timeout: 10_000 });
});

// ─── Publish flow ────────────────────────────────────────────────────────

When("the user confirms the knowledge article publish", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.confirmPublishArticle();
});

// ─── Success toast assertions ────────────────────────────────────────────

Then("the knowledge management success toast shows {string}", async ({ knowledgeManagementPage }, text: string) => {
    await knowledgeManagementPage.expectSuccessToast(text);
});

// ─── MSW network resilience steps (@mock) ────────────────────────────────

Given("the knowledge article create API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(KNOWLEDGE_MANAGEMENT_CREATE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the delete knowledge article API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.delete(KNOWLEDGE_MANAGEMENT_DELETE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the submit approval knowledge article API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(KNOWLEDGE_MANAGEMENT_SUBMIT_APPROVAL_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the publish knowledge article API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(KNOWLEDGE_MANAGEMENT_PUBLISH_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the request revision knowledge article API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(KNOWLEDGE_MANAGEMENT_REQUEST_REVISION_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the update knowledge article API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(KNOWLEDGE_MANAGEMENT_UPDATE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});
