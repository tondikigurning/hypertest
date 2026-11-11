/**
 * Shared sort bar steps — list pages (@hyperscal/filters) and create-wizard entity picker (@hyperscal/dataview).
 */
import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { HttpResponse, delay as mswDelay } from "msw";
import { expect, test } from "../../fixtures/base.fixture";
import { DataviewFilterComponent } from "../../components/dataview-filter-component";
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

const { Given, When, Then } = createBdd(test);

Given("a list page with sort is open", async ({ page, pageContext, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

Given("the sort API is configured to return a 500 server error", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the sort API response is delayed by 4 seconds", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(4_000);
        return HttpResponse.json({ rows: [], total_count: 0 });
    });
});

When("the user applies the first available sort option", async ({ page, pageContext, knowledgeManagementPage }) => {
    if (pageContext.currentPage === "knowledge-management") {
        armListResponseProbe(page, pageContext);
        await knowledgeManagementPage.applyFirstAvailableSortOption();
        return;
    }

    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);

    const wizardScope = page.locator('[data-test-id="wizard-step-content"]');
    const wizardAddSort = wizardScope.getByRole("button", { name: /^add sort$/i });
    // Prefer listSurface, but also detect the wizard DOM so we never fall through to
    // filters-only `sort-option-*` locators (dataview has none — that caused the 20s timeout).
    const isWizardEntity =
        pageContext.listSurface === "create-wizard-entity"
        || (await wizardAddSort.isVisible({ timeout: 2_000 }).catch(() => false));

    if (isWizardEntity) {
        pageContext.setListSurface("create-wizard-entity");
        // Re-arm immediately before the click that triggers the list API.
        armListResponseProbe(page, pageContext);
        await new DataviewFilterComponent(page, wizardScope).applyFirstAvailableSort();
        // Dataview sort updates are debounced — wait so the request is in flight for Then.
        await page.waitForTimeout(600);
        return;
    }

    // List pages use @hyperscal/filters (btn-add-sort + sort-option-* test ids).
    // Do not use a broad /sort/i role match — it also hits dataview "Add Sort".
    const sortButton = page
        .getByTestId("btn-add-sort")
        .or(page.getByRole("button", { name: /sort by|sorts applied/i }))
        .first();

    const hasSortButton = await sortButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasSortButton) {
        return;
    }

    await sortButton.click();

    const firstSortOption = page.locator('[data-testid^="sort-option-"]').first();
    await firstSortOption.waitFor({ state: "visible", timeout: 20_000 });
    await firstSortOption.click();
});

When("the user applies each sort option in ascending and descending direction", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    casesPage,
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
        casesPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    ($testInfo as TestInfo).setTimeout(240_000);
    await listPage.applyAllSorts();
});

Then("each sort triggers an API call that returns HTTP 200", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    casesPage,
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
        casesPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    expect(listPage.lastSortResults.length).toBeGreaterThan(0);
    for (const result of listPage.lastSortResults) {
        expect(result.apiStatus, `Sort "${result.sortOptionName}" (${result.direction}) should return HTTP 200`).toBe(200);
        expect(Array.isArray(result.rows), `Sort "${result.sortOptionName}" (${result.direction}) should return a rows array`).toBe(true);
    }
});

Then("each sort response includes rows in the correct order", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    workOrdersPage,
    knowledgeManagementPage,
    usersCreatePage,
    casesPage,
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
        casesPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    for (const result of listPage.lastSortResults) {
        if (result.orderConsistent !== null) {
            expect(
                result.orderConsistent,
                `Sort "${result.sortOptionName}" (${result.direction}) rows should be in ${result.direction} date order`,
            ).toBe(true);
        }
    }
});
