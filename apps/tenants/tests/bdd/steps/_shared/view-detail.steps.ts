/** View-detail steps — master: features/_components/view-detail.feature */
import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { HttpResponse, delay as mswDelay } from "msw";
import { expect, test } from "../../fixtures/base.fixture";
import {
    resolvePage,
    syncPageContextFromScenario,
    type PageContext,
} from "../../fixtures/page-context";
import type { AccessRolesPage } from "../../pages/iam/AccessRolesPage";
import type { PermissionSetsPage } from "../../pages/iam/PermissionSetsPage";
import type { CasesPage } from "../../pages/case-management/CasesPage";
import type { UserGroupsPage } from "../../pages/user-management/UserGroupsPage";
import type { UsersPage } from "../../pages/user-management/UsersPage";
import type { WorkOrdersPage } from "../../pages/workforce-management/WorkOrdersPage";
import type { KnowledgeManagementPage } from "../../pages/knowledge-management/KnowledgeManagementPage";
import type { OrganizationsPage } from "../../pages/organization-management/OrganizationsPage";
import type { EntitiesPage } from "../../pages/organization-management/EntitiesPage";
import type { SurveyTemplateManagerPage } from "../../pages/case-management/SurveyTemplateManagerPage";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    navigateToList,
    registerListDetail500,
    registerListDetailHandler,
    waitForDelayedListResponse,
} from "../../utils/list-page-network-utils";

const { Given, When, Then } = createBdd(test);

type DetailPanelPage =
    | UsersPage
    | UserGroupsPage
    | AccessRolesPage
    | PermissionSetsPage
    | WorkOrdersPage
    | KnowledgeManagementPage | CasesPage | SurveyTemplateManagerPage | OrganizationsPage | EntitiesPage;

function resolveDetailPanelPage(fixtures: {
    pageContext: PageContext;
    usersPage: UsersPage;
    userGroupsPage: UserGroupsPage;
    accessRolesPage: AccessRolesPage;
    permissionSetsPage: PermissionSetsPage;
    workOrdersPage?: WorkOrdersPage;
    knowledgeManagementPage?: KnowledgeManagementPage;
    casesPage?: CasesPage;
    surveyTemplateManagerPage?: SurveyTemplateManagerPage;
    organizationsPage?: OrganizationsPage;
    entitiesPage?: EntitiesPage;
    currentUrl?: string;
}): DetailPanelPage {
    return resolvePage(fixtures);
}

Given("a list page with detail panel layout is open", async ({ page, pageContext, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

Given("the detail panel API is configured to return a 500 server error", async ({ network, pageContext }) => {
    registerListDetail500(network, pageContext);
});

Given("the detail panel API response is delayed by 3 seconds", async ({ network, pageContext }) => {
    registerListDetailHandler(network, pageContext, async () => {
        await mswDelay(3_000);
        return HttpResponse.json({ id: "user-1", email: "user@example.com", name: "User Name" });
    });
});

Given("the detail panel is open", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.openDetailPanel();
});

When("the user clicks the first list row", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
    knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, $testInfo }) => {
    if (pageContext.currentPage === "survey-template-manager") {
        if (!(await surveyTemplateManagerPage.hasTemplateCards())) {
            $testInfo.skip(true, "No survey template card is available to preview. This scenario depends on environment seed data.");
        }
        await surveyTemplateManagerPage.openFirstTemplatePreview();
        return;
    }

    const hasAnyRow = await page
        .locator('[data-testid="data-table"] tbody tr, table tbody tr, [role="table"] tbody tr')
        .first()
        .isVisible()
        .catch(() => false);
    if (!hasAnyRow) {
        $testInfo.skip(
            true,
            "No list row is available to open the detail panel. This scenario depends on environment seed data.",
        );
    }

    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);

    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.table.openRowDetail(0);
});

When("the user clicks the {string} detail panel tab", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }, tabName: string) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.clickDetailPanelTab(tabName);
});

When("the user closes the detail panel", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.closeDetailPanel();
});

Then("the detail panel is visible", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.expectDetailPanelVisible();
});

Then("the detail panel is not visible", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.expectDetailPanelHidden();
});

Then("the detail panel header shows a title", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.expectDetailPanelHasTitle();
});

Then("the {string} tab content is visible", async ({ page, pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage, knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage }, tabName: string) => {
    const detailPage = resolveDetailPanelPage({
        pageContext, usersPage, userGroupsPage, accessRolesPage, permissionSetsPage, workOrdersPage,
        knowledgeManagementPage, casesPage, surveyTemplateManagerPage, organizationsPage, entitiesPage, currentUrl: page.url()
    });
    await detailPage.expectDetailTabContentVisible(tabName);
});

Then("the loading skeleton is visible before the detail panel content loads", async ({ page, pageContext }) => {
    const skeleton = page.locator('[data-testid="bg-skeleton"], [data-testid*="skeleton"], .skeleton, [role="progressbar"]');
    const hasSkeleton = await skeleton.first().isVisible().catch(() => false);

    if (hasSkeleton) {
        return;
    }

    const delayedDetailObserved = await waitForDelayedListResponse(page, pageContext, 2_500);
    expect(
        delayedDetailObserved,
        "Expected a detail skeleton or delayed detail API response to be observable",
    ).toBe(true);
});
