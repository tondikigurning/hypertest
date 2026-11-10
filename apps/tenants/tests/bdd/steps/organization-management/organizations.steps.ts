/**
 * BDD steps — Organization Management / Organizations & Entities (organizations.feature).
 * Auth via storageState (tests/bdd/setup/auth.setup.ts).
 */
import type { TestInfo } from "@playwright/test";
import { http, HttpResponse } from "msw";
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import { OrganizationsPage } from "../../pages/organization-management/OrganizationsPage";
import { EntitiesPage } from "../../pages/organization-management/EntitiesPage";
import { EntityDetailPage } from "../../pages/organization-management/EntityDetailPage";

const { Given, When, Then } = createBdd(test);

// ─── Navigation Givens ───────────────────────────────────────────────────

Given("the user is on the organization management page", async ({ pageContext, organizationsPage }) => {
    pageContext.setCurrentPage("organizations");
    await organizationsPage.navigateTo();
});

Given("the user is on the entities list page", async ({ pageContext, entitiesPage }) => {
    pageContext.setCurrentPage("entities");
    await entitiesPage.navigateTo();
});

Given("the user is on the entity detail page", async ({ pageContext, entitiesPage, entityDetailPage, organizationsPage }) => {
    pageContext.setCurrentPage("entities");
    const orgId = await organizationsPage.getFirstRowDisplayName();
    await entitiesPage.navigateTo(orgId);
    await entitiesPage.openFirstEntityDetail();
    await entityDetailPage.expectLoaded();
});

// ─── Organization List Flow ──────────────────────────────────────────────

Then("the organizations table is visible", async ({ organizationsPage }) => {
    await organizationsPage.table.expectVisible();
});

Then("the organizations table shows the {string} column", async ({ organizationsPage }, columnName: string) => {
    await organizationsPage.table.expectVisible();
    const header = organizationsPage.page.getByRole("columnheader", { name: new RegExp(columnName, "i") });
    await expect(header).toBeVisible({ timeout: 10_000 });
});

Then("each organization row shows the {string} and {string} actions", async ({ organizationsPage }, action1: string, action2: string) => {
    await organizationsPage.table.expectVisible();
    const rowCount = await organizationsPage.table.rows.count();
    expect(rowCount).toBeGreaterThan(0);
});

When("the user opens the first organization row", async ({ organizationsPage }) => {
    await organizationsPage.openDetailPanel();
});

When("the user opens {string} for the first organization", async ({ organizationsPage }, action: string) => {
    if (/entities/i.test(action)) {
        await organizationsPage.openEntitiesForFirstRow();
    } else if (/settings/i.test(action)) {
        await organizationsPage.openSettingsForFirstRow();
    }
});

Then("the entities table is visible", async ({ entitiesPage }) => {
    await entitiesPage.table.expectVisible();
});

Then("the entities table shows the columns:", async ({ entitiesPage }) => {
    await entitiesPage.table.expectVisible();
});

Then("the organization detail sidebar shows:", async ({ organizationsPage }) => {
    await organizationsPage.detailPanel.expectVisible();
});

When("the user clicks the create organization button", async ({ organizationsPage }) => {
    await organizationsPage.clickCreate();
});

When("the user fills the organization name", async ({ page }) => {
    const nameInput = page.getByRole("textbox", { name: /organization display name|name/i }).or(page.locator('input[name="name"]')).first();
    await nameInput.fill("E2E Test Organization " + Date.now());
});

When("the user submits the create organization dialog", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /create|save|submit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();
});

When("the user cancels the create organization dialog", async ({ page }) => {
    const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
    await cancelBtn.click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });
});

Then("the create organization dialog is visible", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /create organization|new organization/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
});


Then("the create organization dialog is not visible", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /create organization|new organization/i });
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
});

Then("the organization list page is displayed", async ({ organizationsPage }) => {
    await organizationsPage.expectLoaded();
});

Then("the success response shows the organization has been created", async ({ organizationsPage }) => {
    await organizationsPage.responseModal.expectVisible(/created|success/i);
});

// ─── Entity List Flow ────────────────────────────────────────────────────
Then("the entities table shows the {string} column", async ({ entitiesPage }, columnName: string) => {
    await entitiesPage.table.expectVisible();
    const header = entitiesPage.page.getByRole("columnheader", { name: new RegExp(columnName, "i") });
    await expect(header).toBeVisible({ timeout: 10_000 });
});

When("the user clicks the create entity button", async ({ entitiesPage }) => {
    await entitiesPage.clickCreate();
});

When("the user fills the entity name", async ({ page }) => {
    const nameInput = page.getByRole("textbox", { name: /entity name|name/i }).or(page.locator('input[name="name"]')).first();
    await nameInput.fill("E2E Test Entity " + Date.now());
});

When("the user submits the create entity dialog", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /create|save|submit/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();
});

When("the user cancels the create entity dialog", async ({ page }) => {
    const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
    await cancelBtn.click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });
});

Then("the create entity dialog is visible", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /create entity|new entity/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
});

Then("the create entity dialog is not visible", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /create entity|new entity/i });
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
});

Then("the entities list page is displayed", async ({ entitiesPage }) => {
    await entitiesPage.expectLoaded();
});

Then("the success response shows the entity has been created", async ({ entitiesPage }) => {
    await entitiesPage.responseModal.expectVisible(/created|success/i);
});

// ─── Entity Detail Flow ──────────────────────────────────────────────────

When("the user clicks the {string} entity detail tab", async ({ entityDetailPage }, tabName: string) => {
    await entityDetailPage.detailPanel.clickTab(tabName);
});

When("the user opens the first entity row", async ({ entitiesPage }) => {
    await entitiesPage.openFirstEntityDetail();
});

When("the user closes the entity detail panel", async ({ entityDetailPage }) => {
    await entityDetailPage.closeDetailPanel();
});

When("the user searches organizations for the first visible row", async ({ organizationsPage }) => {
    const displayName = await organizationsPage.getFirstRowDisplayName();
    await organizationsPage.searchFilter(displayName);
});

Then("the search returns matching organizations", async ({ organizationsPage }) => {
    expect(organizationsPage.lastSearchMatched).toBe(true);
});

When("the user searches entities for the first visible row", async ({ entitiesPage }) => {
    const displayName = await entitiesPage.getFirstRowDisplayName();
    await entitiesPage.searchFilter(displayName);
});

Then("the search returns matching entities", async ({ entitiesPage }) => {
    expect(entitiesPage.lastSearchMatched).toBe(true);
});

Then("the entity detail panel is visible", async ({ entityDetailPage }) => {
    await entityDetailPage.detailPanel.expectVisible();
});

Then("the entity detail panel header shows a title", async ({ entityDetailPage }) => {
    await entityDetailPage.detailPanel.expectHasTitle();
});

Then("the entity detail panel is not visible", async ({ entityDetailPage }) => {
    await entityDetailPage.detailPanel.expectHidden();
});

When("the user applies the {string} filter on entities", async ({ entitiesPage }, filterOption: string) => {
    await entitiesPage.applySingleFilter(filterOption);
});

Then("the filter returns matching entities", async ({ entitiesPage }) => {
    expect(entitiesPage.lastFilterResults.length).toBeGreaterThan(0);
});

When("the user applies all sort options on entities", async ({ entitiesPage }) => {
    await entitiesPage.applyAllSorts();
});

Then("each sort returns matching entities", async ({ entitiesPage }) => {
    expect(entitiesPage.lastSortResults.length).toBeGreaterThan(0);
});

// ─── Organization Permission Flow ────────────────────────────────────────

When("the user opens the organization permission panel", async ({ organizationsPage }) => {
    await organizationsPage.detailPanel.headerButton(/Organization Permission/i).click();
});

When("the user opens the entity permission panel", async ({ page }) => {
    const btn = page.getByRole("button", { name: /Entity Permission/i }).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
});

When("the user adds the first available role member", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add|new/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
});

Then("the success response shows the permission has been updated", async ({ page }) => {
    const modal = page.getByRole("dialog").filter({ hasText: /updated|success/i }).last();
    await expect(modal).toBeVisible({ timeout: 45_000 });
});

// ─── Entity Permission Flow ──────────────────────────────────────────────

When("the user adds the first available entity permission", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add entity permission|add/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
});

// ─── Entity Teams Flow ───────────────────────────────────────────────────

When("the user creates a new team", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /create team|new team/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
});

When("the user manages members for the first team", async ({ page }) => {
    const manageBtn = page.getByRole("button", { name: /manage members/i }).first();
    await expect(manageBtn).toBeVisible({ timeout: 10_000 });
    await manageBtn.click();
});

// ─── Entity Sites Flow ───────────────────────────────────────────────────

When("the user creates a new site", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /new site|create site/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
});

// ─── Organization Policies Flow ──────────────────────────────────────────

When("the user creates a new organization policy", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /create policy|new policy/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
});

When("the user advances the policy wizard to the summary step", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /next/i });
    await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
    await nextBtn.click();
});

When("the user confirms the policy creation", async ({ page }) => {
    const confirmBtn = page.getByRole("button", { name: /confirm|create|submit/i }).first();
    await expect(confirmBtn).toBeEnabled({ timeout: 10_000 });
    await confirmBtn.click();
});

Then("the success response shows the policy creation success screen is displayed", async ({ page }) => {
    const success = page.getByRole("dialog").filter({ hasText: /policy.*created|success/i }).last();
    await expect(success).toBeVisible({ timeout: 45_000 });
});

Then("the success response shows the team has been created", async ({ page }) => {
    const modal = page.getByRole("dialog").filter({ hasText: /team.*created|success/i }).last();
    await expect(modal).toBeVisible({ timeout: 45_000 });
});

Then("the success response shows the site has been created", async ({ page }) => {
    const modal = page.getByRole("dialog").filter({ hasText: /site.*created|success/i }).last();
    await expect(modal).toBeVisible({ timeout: 45_000 });
});

// ─── Search / Filter / Sort (shared) ─────────────────────────────────────

When("the user searches organizations for {string}", async ({ organizationsPage }, value: string) => {
    await organizationsPage.searchFilter(value);
});

When("the user applies the {string} filter on organizations", async ({ organizationsPage }, filterOption: string) => {
    await organizationsPage.applySingleFilter(filterOption);
});

Then("the filter returns matching organizations", async ({ organizationsPage }) => {
    expect(organizationsPage.lastFilterResults.length).toBeGreaterThan(0);
});

When("the user applies all sort options on organizations", async ({ organizationsPage }) => {
    await organizationsPage.applyAllSorts();
});

Then("each sort returns matching organizations", async ({ organizationsPage }) => {
    expect(organizationsPage.lastSortResults.length).toBeGreaterThan(0);
});

// ─── Navigation-triggered mock ───────────────────────────────────────────

When("the user navigates to the organizations list page", async ({ page, pageContext, organizationsPage }) => {
    pageContext.setCurrentPage("organizations");
    await organizationsPage.navigateTo();
});

// ─── MSW network resilience (@mock) ──────────────────────────────────────

Given("the organizations API is configured to return a 401 authentication error", async ({ network }) => {
    network.use(
        http.get(/\/organization\/tenant\/sub-tenants\/filter/, () =>
            HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
        )
    );
});

Given("the organizations API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.get(/\/organization\/tenant\/sub-tenants\/filter/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the entities API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.get(/\/organization\/tenant\/sub-tenants\/[^/]+\/units\/filter/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the create organization API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/organization\/tenant\/sub-tenants/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the create entity API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/organization\/tenant\/sub-tenants\/[^/]+\/units/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});
