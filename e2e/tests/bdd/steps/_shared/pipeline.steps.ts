/** Pipeline tab steps — master: features/_components/pipeline.feature */
import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { HttpResponse } from "msw";
import { test } from "../../fixtures/base.fixture";
import {
    resolvePage,
    syncPageContextFromScenario,
    type PageContext,
} from "../../fixtures/page-context";
import { armListResponseProbe, navigateToList, registerListFilterHandler } from "../../utils/list-page-network-utils";

const { Given, When, Then } = createBdd(test);

Given("a list page with pipeline tabs is open", async ({ page, pageContext, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

Given("the pipeline tab API is configured to return a 500 server error", async ({ network, pageContext }) => {
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

type PipelineTabHandle = {
    getAttribute: (name: string) => Promise<string | null>;
    isVisible: () => Promise<boolean>;
};

type PipelinePage = {
    pipeline: {
        tab: (tab: string) => PipelineTabHandle;
        selectTab: (tab: string) => Promise<void>;
        expectTabActive: (tab: string) => Promise<void>;
    };
    selectPipelineTab: (tab: string) => Promise<void>;
};

function hasPipeline(value: unknown): value is PipelinePage {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as {
        selectPipelineTab?: unknown;
        pipeline?: {
            tab?: unknown;
            selectTab?: unknown;
            expectTabActive?: unknown;
        };
    };

    return (
        typeof candidate.selectPipelineTab === "function"
        && typeof candidate.pipeline?.tab === "function"
        && typeof candidate.pipeline?.selectTab === "function"
        && typeof candidate.pipeline?.expectTabActive === "function"
    );
}

function resolvePipelinePage(fixtures: {
    pageContext: PageContext;
    usersPage: PipelinePage;
    userGroupsPage: unknown;
    casesPage?: PipelinePage;
    workOrdersPage?: unknown;
    knowledgeManagementPage?: unknown;
    currentUrl?: string;
}): PipelinePage {
    const userGroupsPipelinePage = hasPipeline(fixtures.userGroupsPage)
        ? fixtures.userGroupsPage
        : fixtures.usersPage;

    const workOrdersPipelinePage = hasPipeline(fixtures.workOrdersPage)
        ? fixtures.workOrdersPage
        : userGroupsPipelinePage;

    const knowledgeManagementPipelinePage = hasPipeline(fixtures.knowledgeManagementPage)
        ? fixtures.knowledgeManagementPage
        : workOrdersPipelinePage;

    return resolvePage({
        pageContext: fixtures.pageContext,
        usersPage: fixtures.usersPage,
        userGroupsPage: userGroupsPipelinePage,
        casesPage: fixtures.casesPage,
        workOrdersPage: workOrdersPipelinePage,
        knowledgeManagementPage: knowledgeManagementPipelinePage,
        currentUrl: fixtures.currentUrl,
    });
}

When("the user selects the {string} pipeline tab", async ({ page, pageContext, usersPage, userGroupsPage, casesPage, workOrdersPage, knowledgeManagementPage, $testInfo }, tab: string) => {
    const listPage = resolvePipelinePage({ pageContext, usersPage, userGroupsPage, casesPage, workOrdersPage, knowledgeManagementPage, currentUrl: page.url() });
    const targetTab = listPage.pipeline.tab(tab);
    const tabVisible = await targetTab.isVisible().catch(() => false);
    const isMockScenario = $testInfo.tags.includes("@mock");

    const selectTab = async (target: string): Promise<void> => {
        if (isMockScenario) {
            await listPage.pipeline.selectTab(target);
            return;
        }
        await listPage.selectPipelineTab(target);
    };

    if (tabVisible) {
        // Tab is in the main tab bar — check if it's already active.
        const alreadyActive = (await targetTab.getAttribute("data-state")) === "active";
        if (alreadyActive) {
            // Click another visible tab first so the target tab click registers.
            const fallbackCandidates = ["All", "Active", "Unassigned", "Invited", "Suspended", "Assigned", "In Progress", "Completed", "On Hold", "Canceled", "Rescheduled"];
            for (const candidate of fallbackCandidates) {
                if (candidate.toLowerCase() === tab.toLowerCase()) continue;
                const fallbackTab = listPage.pipeline.tab(candidate);
                const fallbackVisible = await fallbackTab.isVisible().catch(() => false);
                if (!fallbackVisible) continue;
                await selectTab(candidate);
                break;
            }
        }
    }

    // Arm before the tab request fires so the 500-error-state step can consume it even
    // though the response has already settled by the time the Then runs.
    armListResponseProbe(page, pageContext);
    await selectTab(tab);
});

Then("the {string} pipeline tab is active", async ({ page, pageContext, usersPage, userGroupsPage, casesPage, workOrdersPage, knowledgeManagementPage }, tab: string) => {
    const listPage = resolvePipelinePage({ pageContext, usersPage, userGroupsPage, casesPage, workOrdersPage, knowledgeManagementPage, currentUrl: page.url() });
    await listPage.pipeline.expectTabActive(tab);
});
