import { expect } from "@playwright/test";
import { test as base } from "playwright-bdd";
import { defineNetworkFixture, type NetworkFixture } from "@msw/playwright";
import type { AnyHandler } from "msw";
import { AccessRolesPage } from "../pages/iam/AccessRolesPage";
import { PermissionSetsPage } from "../pages/iam/PermissionSetsPage";
import { CaseDashboardPage } from "../pages/case-management/CaseDashboardPage";
import { CasesBulkPage } from "../pages/case-management/CasesBulkPage";
import { CasesPage } from "../pages/case-management/CasesPage";
import { SurveyTemplateManagerPage } from "../pages/case-management/SurveyTemplateManagerPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { UserGroupsPage } from "../pages/user-management/UserGroupsPage";
import { UsersCreatePage } from "../pages/user-management/UsersCreatePage";
import { UsersPage } from "../pages/user-management/UsersPage";
import { WorkOrdersCreatePage } from "../pages/workforce-management/WorkOrdersCreatePage";
import { WorkOrdersPage } from "../pages/workforce-management/WorkOrdersPage";
import { KnowledgeManagementPage } from "../pages/knowledge-management/KnowledgeManagementPage";
import { OrganizationsPage } from "../pages/organization-management/OrganizationsPage";
import { EntitiesPage } from "../pages/organization-management/EntitiesPage";
import { EntityDetailPage } from "../pages/organization-management/EntityDetailPage";
import { ProfanityPage } from "../pages/system-settings/ProfanityPage";
import type { ActivePage, PageContext } from "./page-context";
import { startLivePreview } from "./live-preview";

type BddFixtures = {
    livePreview: void;
    loginPage: LoginPage;
    usersPage: UsersPage;
    usersCreatePage: UsersCreatePage;
    userGroupsPage: UserGroupsPage;
    accessRolesPage: AccessRolesPage;
    permissionSetsPage: PermissionSetsPage;
    casesPage: CasesPage;
    surveyTemplateManagerPage: SurveyTemplateManagerPage;
    casesBulkPage: CasesBulkPage;
    caseDashboardPage: CaseDashboardPage;
    workOrdersPage: WorkOrdersPage;
    workOrdersCreatePage: WorkOrdersCreatePage;
    knowledgeManagementPage: KnowledgeManagementPage;
    organizationsPage: OrganizationsPage;
    entitiesPage: EntitiesPage;
    entityDetailPage: EntityDetailPage;
    profanityPage: ProfanityPage;
    pageContext: PageContext;
    /** Base MSW request handlers. Defaults to empty; @mock step definitions call network.use(). */
    handlers: AnyHandler[];
    /**
     * MSW network interception fixture — tag-driven activation.
     *
     * Runs for every scenario (auto: true) but only calls network.enable() when
     * the Gherkin tag `@mock` is present on the scenario (playwright-bdd maps
     * Gherkin tags to testInfo.tags with the leading `@` included).
     *
     * Rules enforced here:
     *  • @smoke scenarios never carry @mock → always reach the real backend.
     *  • @regression @mock scenarios: MSW intercepts once step definitions call
     *    network.use() before navigation.
     *  • All other scenarios: network object is available but enable() is never
     *    called → every request passes through naturally.
     */
    network: NetworkFixture;
};

export const test = base.extend<BddFixtures>({
    livePreview: [async ({ context }, use) => {
        const stop = await startLivePreview(context);
        try { await use(); } finally { await stop(); }
    }, { auto: true }],
    // Empty baseline — individual @mock step definitions push their own handlers.
    handlers: [[], { option: true }],

    network: [
        async ({ context, handlers }, use, testInfo) => {
            const isMocked = testInfo.tags.includes("@mock");
            const isQuarantined = testInfo.tags.includes("@quarantine");
            const runQuarantined = process.env.RUN_QUARANTINE === "1";

            if (isQuarantined && !runQuarantined) {
                testInfo.skip(true, "Scenario is quarantined due to known app instability.");
            }

            const network = defineNetworkFixture({ context, handlers });

            if (isMocked) {
                await network.enable();
            }

            await use(network);

            if (isMocked) {
                await network.disable();
            }
        },
        { auto: true },
    ],

    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    usersPage: async ({ page }, use) => {
        await use(new UsersPage(page));
    },
    usersCreatePage: async ({ page }, use) => {
        await use(new UsersCreatePage(page));
    },
    userGroupsPage: async ({ page }, use) => {
        await use(new UserGroupsPage(page));
    },
    casesPage: async ({ page }, use) => {
        await use(new CasesPage(page));
    },
    surveyTemplateManagerPage: async ({ page }, use) => {
        const surveyTemplateManagerPage = new SurveyTemplateManagerPage(page);
        try {
            await use(surveyTemplateManagerPage);
        } finally {
            await surveyTemplateManagerPage.cleanupOwnedTemplates();
        }
    },
    casesBulkPage: async ({ page }, use) => {
        await use(new CasesBulkPage(page));
    },
    caseDashboardPage: async ({ page }, use) => {
        await use(new CaseDashboardPage(page));
    },
    accessRolesPage: async ({ page }, use) => {
        await use(new AccessRolesPage(page));
    },
    permissionSetsPage: async ({ page }, use) => {
        await use(new PermissionSetsPage(page));
    },
    workOrdersPage: async ({ page }, use) => {
        await use(new WorkOrdersPage(page));
    },
    workOrdersCreatePage: async ({ page }, use) => {
        await use(new WorkOrdersCreatePage(page));
    },
    knowledgeManagementPage: async ({ page }, use) => {
        await use(new KnowledgeManagementPage(page));
    },
    organizationsPage: async ({ page }, use) => {
        await use(new OrganizationsPage(page));
    },
    entitiesPage: async ({ page }, use) => {
        await use(new EntitiesPage(page));
    },
    entityDetailPage: async ({ page }, use) => {
        await use(new EntityDetailPage(page));
    },
    profanityPage: async ({ page, network }, use, testInfo) => {
        const profanityPage = new ProfanityPage(page);
        await use(profanityPage);

        // Tear down MSW overrides before cleanup so mocked mutation failures cannot
        // block removal of records created by this scenario.
        if (testInfo.tags.includes("@mock")) {
            await network.disable();
        }
        await profanityPage.cleanupAfterScenario();
    },
    pageContext: async ({ }, use) => {
        const state: PageContext = {
            currentPage: "users",
            listSurface: "list",
            createdArticleName: null,
            setCurrentPage(nextPage: ActivePage) {
                state.currentPage = nextPage;
            },
            setListSurface(surface) {
                state.listSurface = surface;
            },
            setCreatedArticleName(name: string | null) {
                state.createdArticleName = name;
            },
        };
        await use(state);
    },
});

export { expect };
