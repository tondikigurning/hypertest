/** Filter/search steps — master: features/_components/filter*.feature */
import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import { HttpResponse, delay as mswDelay } from "msw";
import {
    resolveFilterablePage,
    syncPageContextFromScenario,
} from "../../fixtures/page-context";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    navigateToList,
    registerListFilterHandler,
} from "../../utils/list-page-network-utils";
import { ENTITY_FILTER_LABELS } from "../../components/dataview-filter-component";

const { Given, When, Then } = createBdd(test);

Given("a list page with filters is open", async ({ page, pageContext, $testInfo }) => {
    const isComponentTest = $testInfo.tags.some((tag) =>
        tag.toUpperCase().startsWith("@TEN_COM_"),
    );

    if (isComponentTest) {
        pageContext.setCurrentPage("users");
    }

    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    await navigateToList(page, pageContext, $testInfo as TestInfo);

    const currentUrl = page.url();
    const filterButton = page.getByTestId("btn-add-filter");
    try {
        await filterButton.waitFor({ state: "visible", timeout: 10_000 });
    } catch (error) {
        throw new Error(`Filter button not found on page: ${currentUrl}`);
    }
});

Given("the filter API is configured to return a 500 server error", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the filter API response is delayed by 4 seconds", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(4_000);
        return HttpResponse.json({ rows: [], total_count: 0 });
    });
});

When("the user applies the first available filter option", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
}) => {
    if (pageContext.currentPage === "knowledge-management") {
        // Arm before the request fires so the 500-error-state step can consume it even
        // though the response has already settled by the time the Then runs.
        armListResponseProbe(page, pageContext);
        await knowledgeManagementPage.applyFirstAvailableFilterOption();
        return;
    }

    ensureListResponseTracking(page, pageContext);

    // Create-user wizard entity picker uses @hyperscal/dataview Filter.Content
    // (role-based "Add Filter", no btn-add-filter / filter-option-* test ids).
    if (pageContext.listSurface === "create-wizard-entity") {
        const scope = page.locator('[data-test-id="wizard-step-content"]');
        const addFilter = scope.getByRole("button", { name: /^add filter$/i });
        await addFilter.waitFor({ state: "visible", timeout: 15_000 });
        await addFilter.click();

        // Company Name is an enum ComboBox on the entity picker (not a free-text input).
        const companyNameLabel = ENTITY_FILTER_LABELS.name;
        await page
            .locator("[data-radix-popper-content-wrapper]")
            .filter({ has: page.getByPlaceholder("Type a value or choose options") })
            .locator("div.flex.cursor-pointer.items-center.gap-2")
            .filter({ hasText: companyNameLabel })
            .first()
            .click();

        const combobox = page
            .getByPlaceholder("Search or select an item...")
            .or(page.getByRole("combobox"))
            .last();
        await combobox.waitFor({ state: "visible", timeout: 10_000 });

        // Arm after the field is selected so the probe measures the value-triggered request.
        armListResponseProbe(page, pageContext);
        await combobox.click();
        const firstOption = page.getByRole("option").first();
        await firstOption.waitFor({ state: "visible", timeout: 10_000 });
        await firstOption.click();
        // Dataview filter updates are debounced (~500–800ms) — wait so the list request
        // is in flight (loading UI / delayed MSW response) before the Then step.
        await page.waitForTimeout(800);
        return;
    }

    armListResponseProbe(page, pageContext);

    const filterButton = page
        .getByTestId("btn-add-filter")
        .or(page.getByRole("button", { name: /add filters|filter applied/i }))
        .first();

    const hasFilterButton = await filterButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasFilterButton) {
        return;
    }

    await filterButton.click();

    // Pick the first available filter option dynamically (don't hardcode display_name).
    const firstFilterOption = page.locator('[data-testid^="filter-option-"]').first();
    await firstFilterOption.waitFor({ state: "visible", timeout: 20_000 });
    await firstFilterOption.click();

    const filterInput = page.getByTestId("input-filter-value").first();
    await filterInput.waitFor({ state: "visible", timeout: 20_000 });
    await filterInput.fill("test");

    await page.getByRole("button", { name: "Add Filter" }).click();
    await page.keyboard.press("Escape");
});

When("the user applies each available filter option", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
    $testInfo,
}) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    ($testInfo as TestInfo).setTimeout(360_000);

    // Ensure the filter button is ready before proceeding
    const filterButton = page.getByTestId("btn-add-filter");
    await filterButton.waitFor({ state: "visible", timeout: 15_000 });

    const fieldValues = await listPage.buildFilterFieldValuesFromFirstRow();
    await listPage.applyAllFilters(fieldValues);
});

When("the user applies the {string} filter option", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
}, filterOption) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    const fieldValues = await listPage.buildFilterFieldValuesFromFirstRow();
    await listPage.applySingleFilter(filterOption, fieldValues);
});

Then("each filter triggers an API call that returns HTTP 200", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
}) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    expect(listPage.lastFilterResults.length).toBeGreaterThan(0);
    for (const result of listPage.lastFilterResults) {
        expect(result.apiStatus, `Filter "${result.filterName}" should return HTTP 200`).toBe(200);
    }
});

Then("the filter triggers an API call that returns HTTP 200", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
}) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    expect(listPage.lastFilterResults.length).toBe(1);
    expect(listPage.lastFilterResults[0].apiStatus, `Filter should return HTTP 200`).toBe(200);
});

Then("each filter response includes rows that match the selected value", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
}) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    for (const result of listPage.lastFilterResults) {
        expect(result.rowCount, `"${result.filterName}" response should include a rows array`).toBeGreaterThanOrEqual(0);
        if (result.rowsMatchFilter !== null && result.inputType === "text") {
            expect(
                result.rowsMatchFilter,
                `"${result.filterName}" rows should contain "${result.selectedValue}"`,
            ).toBe(true);
        }
    }
});

Then("the filter response includes rows that match the selected value", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    surveyTemplateManagerPage,
}) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        workOrdersPage,
        usersCreatePage,
        knowledgeManagementPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    expect(listPage.lastFilterResults.length).toBe(1);
    const result = listPage.lastFilterResults[0];
    expect(result.rowCount, `Filter response should include a rows array`).toBeGreaterThanOrEqual(0);
    if (result.rowsMatchFilter !== null && result.inputType === "text") {
        expect(
            result.rowsMatchFilter,
            `Filter rows should contain "${result.selectedValue}"`,
        ).toBe(true);
    }
});
