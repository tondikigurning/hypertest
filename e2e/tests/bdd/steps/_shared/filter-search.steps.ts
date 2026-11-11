import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { HttpResponse, delay as mswDelay } from "msw";
import { expect, test } from "../../fixtures/base.fixture";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    navigateToList,
    registerListFilterHandler,
} from "../../utils/list-page-network-utils";
import {
    resolveFilterablePage,
    syncPageContextFromScenario,
} from "../../fixtures/page-context";

const { Given, When, Then } = createBdd(test);

Given("a list page with search is open", async ({ page, pageContext, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

Given("the search API is configured to return a 500 server error", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the search API response is delayed by 4 seconds", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(4_000);
        return HttpResponse.json({ rows: [], total_count: 0 });
    });
});

When("the user searches for {string}", async ({ page, pageContext }, searchText: string) => {
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);

    const searchInput = page
        .getByTestId("filter-search-input")
        .or(page.getByRole("textbox", { name: /search/i }))
        .first();
    await searchInput.waitFor({ state: "visible", timeout: 20_000 });
    await searchInput.click();
    await searchInput.fill("");
    await searchInput.fill(searchText);
    await searchInput.press("Enter");
});

When("the user searches for the first visible row {string}", async ({
    page,
    pageContext,
    usersPage,
    userGroupsPage,
    accessRolesPage,
    permissionSetsPage,
    usersCreatePage,
    workOrdersPage,
    knowledgeManagementPage,
    casesPage,
    surveyTemplateManagerPage,
}, field: string) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        usersCreatePage,
        workOrdersPage,
        knowledgeManagementPage,
        casesPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    // The component master (no Examples) passes "<field>" literally — default to "name"
    const effectiveField = field === "field" ? "name" : field;
    const keyword = await listPage.getFirstRowFieldValue(effectiveField);
    await listPage.searchFilterKeep(keyword);
});

Then("the search returns matching rows", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, usersCreatePage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage }) => {
    const listPage = resolveFilterablePage({
        pageContext,
        usersPage,
        userGroupsPage,
        accessRolesPage,
        permissionSetsPage,
        usersCreatePage,
        workOrdersPage,
        knowledgeManagementPage,
        casesPage,
        surveyTemplateManagerPage,
        currentUrl: page.url(),
    });
    expect(
        listPage.lastSearchMatched,
        `Search for "${listPage.lastSearchKeyword}" should return matching rows`,
    ).toBe(true);
});

