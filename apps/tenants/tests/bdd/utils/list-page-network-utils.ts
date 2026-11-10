import type { TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import type { NetworkFixture } from "@msw/playwright";
import { http, HttpResponse } from "msw";
import { FilterComponent } from "../components/FilterComponent";
import { DataTableComponent } from "../components/DataTableComponent";
import { DetailPanelComponent } from "../components/DetailPanelComponent";
import { PipelineComponent } from "../components/PipelineComponent";
import type { PageContext } from "../fixtures/page-context";
import {
    ACCESS_ROLES_FILTER_API,
    ACCESS_ROLES_LIST_PATH,
    CASES_FILTER_API,
    CASES_LIST_PATH,
    ENTITIES_UNITS_FILTER_API,
    ENTITIES_UNITS_FILTER_URL,
    KNOWLEDGE_MANAGEMENT_FILTER_API,
    KNOWLEDGE_MANAGEMENT_LIST_PATH,
    PERMISSION_SETS_FILTER_API,
    PERMISSION_SETS_LIST_PATH,
    SURVEY_TEMPLATE_MANAGER_FILTER_API,
    SURVEY_TEMPLATE_MANAGER_LIST_PATH,
    USER_GROUPS_FILTER_API,
    USER_GROUPS_LIST_PATH,
    USERS_FILTER_API,
    USERS_LIST_PATH,
    WORK_ORDERS_FILTER_API,
    WORK_ORDERS_LIST_PATH,
} from "./list-page-constants";
import { dismissTencentWorkbenchIfPresent } from "./tencent-workbench-utils";

type PlaywrightPage = import("@playwright/test").Page;

type ActivePage = PageContext["currentPage"];

const LIST_CONFIG: Record<
    ActivePage,
    {
        listPath: string;
        filterApi: string;
        filterUrl: RegExp;
        detailUrl: RegExp;
    }
> = {
    users: {
        listPath: USERS_LIST_PATH,
        filterApi: USERS_FILTER_API,
        filterUrl: /\/iam\/tenant\/users\/filter/,
        detailUrl: /\/iam\/tenant\/users\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "user-groups": {
        listPath: USER_GROUPS_LIST_PATH,
        filterApi: USER_GROUPS_FILTER_API,
        filterUrl: /\/iam\/tenant\/user-groups\/filter/,
        detailUrl: /\/iam\/tenant\/user-groups\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "access-roles": {
        listPath: ACCESS_ROLES_LIST_PATH,
        filterApi: ACCESS_ROLES_FILTER_API,
        filterUrl: /\/iam\/tenant\/access-roles\/filter/,
        detailUrl: /\/iam\/tenant\/access-roles\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "permission-sets": {
        listPath: PERMISSION_SETS_LIST_PATH,
        filterApi: PERMISSION_SETS_FILTER_API,
        filterUrl: /\/iam\/tenant\/permission-sets\/filter/,
        detailUrl: /\/iam\/tenant\/permission-sets\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "work-orders": {
        listPath: WORK_ORDERS_LIST_PATH,
        filterApi: WORK_ORDERS_FILTER_API,
        filterUrl: /\/workforcemgmt\/tenant\/work-orders\/filter/,
        detailUrl: /\/workforcemgmt\/tenant\/work-orders\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "knowledge-management": {
        listPath: KNOWLEDGE_MANAGEMENT_LIST_PATH,
        filterApi: KNOWLEDGE_MANAGEMENT_FILTER_API,
        filterUrl: /\/knowledge\/tenant\/articles\/filter/,
        detailUrl: /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+(?:\?.*)?$/,
    },
    "cases": {
        listPath: CASES_LIST_PATH,
        filterApi: CASES_FILTER_API,
        filterUrl: /\/casemgmt\/tenant\/cases\/regular\/filter/,
        detailUrl: /\/casemgmt\/tenant\/cases\/(?!regular\/filter(?:\?|$)|filter(?:\?|$))[^/?#]+(?:\?.*)?$/,
    },
    "survey-template-manager": {
        listPath: SURVEY_TEMPLATE_MANAGER_LIST_PATH,
        filterApi: SURVEY_TEMPLATE_MANAGER_FILTER_API,
        filterUrl: /\/casemgmt\/tenant\/survey\/list(?:\?|$)/,
        detailUrl: /\/casemgmt\/tenant\/survey\/templates\/details(?:\?|$)/,
    },
};

const trackedResponses = new WeakMap<
    PlaywrightPage,
    Array<{ url: string; status: number; at: number }>
>();

const pendingResponseProbe = new WeakMap<
    PlaywrightPage,
    Promise<{ status: number; elapsedMs: number } | null>
>();

function getListConfig(pageContext: PageContext) {
    return LIST_CONFIG[pageContext.currentPage];
}

function getFilterConfig(pageContext: PageContext) {
    if (pageContext.listSurface === "create-wizard-entity") {
        return {
            filterApi: ENTITIES_UNITS_FILTER_API,
            filterUrl: ENTITIES_UNITS_FILTER_URL,
        };
    }

    return getListConfig(pageContext);
}

export function isListApiUrl(url: string, pageContext: PageContext): boolean {
    if (pageContext.listSurface === "create-wizard-entity") {
        return ENTITIES_UNITS_FILTER_URL.test(url);
    }

    const config = getListConfig(pageContext);
    return config.filterUrl.test(url) || config.detailUrl.test(url);
}

export function ensureListResponseTracking(page: PlaywrightPage, pageContext: PageContext): void {
    if (trackedResponses.has(page)) {
        return;
    }

    trackedResponses.set(page, []);
    page.on("response", (response) => {
        const url = response.url();
        if (!isListApiUrl(url, pageContext)) {
            return;
        }

        const bucket = trackedResponses.get(page);
        if (!bucket) {
            return;
        }

        bucket.push({
            url,
            status: response.status(),
            at: Date.now(),
        });

        if (bucket.length > 100) {
            bucket.shift();
        }
    });
}

function recentListResponses(
    page: PlaywrightPage,
    pageContext: PageContext,
    maxAgeMs = 30_000,
): Array<{ url: string; status: number; at: number }> {
    const bucket = trackedResponses.get(page) ?? [];
    const cutoff = Date.now() - maxAgeMs;
    return bucket.filter((entry) => entry.at >= cutoff && isListApiUrl(entry.url, pageContext));
}

export function armListResponseProbe(page: PlaywrightPage, pageContext: PageContext): void {
    const started = Date.now();
    const probe = page
        .waitForResponse((response) => isListApiUrl(response.url(), pageContext), { timeout: 30_000 })
        .then((response) => ({ status: response.status(), elapsedMs: Date.now() - started }))
        .catch(() => null);

    pendingResponseProbe.set(page, probe);
}

function isListFilterPost(response: import("@playwright/test").Response, filterApi: string): boolean {
    return (
        response.url().includes(filterApi)
        && !response.url().includes("filter-options")
        && response.request().method() === "POST"
    );
}

async function resetPipelineToAll(page: PlaywrightPage, filterApi: string): Promise<void> {
    const pipeline = new PipelineComponent(page);
    const allTab = pipeline.tab("All");
    if (!(await allTab.isVisible().catch(() => false))) {
        return;
    }

    if ((await allTab.getAttribute("data-state")) === "active") {
        return;
    }

    const responsePromise = page
        .waitForResponse((res) => isListFilterPost(res, filterApi), { timeout: 30_000 })
        .catch(() => null);

    await pipeline.selectTab("All");
    await responsePromise;
}

/** Reset filter/search/sort and pipeline tab after list navigation (state persists in URL). */
export async function ensureListPageCleanState(page: PlaywrightPage, filterApi: string): Promise<void> {
    await resetPipelineToAll(page, filterApi);
    await new FilterComponent(page).ensureCleanState(filterApi);
}

/** Poll until the data table has at least one row, re-cleaning if the grid is still empty. */
export async function waitForListTableRows(
    page: PlaywrightPage,
    filterApi: string,
    options: { timeout?: number } = {},
): Promise<void> {
    const table = new DataTableComponent(page);
    await table.expectVisible();

    await expect
        .poll(
            async () => {
                const rowCount = await table.rows.count();
                if (rowCount > 0) {
                    return rowCount;
                }

                if (await table.isEmptyStateVisible()) {
                    await ensureListPageCleanState(page, filterApi);
                }

                return await table.rows.count();
            },
            { timeout: options.timeout ?? 45_000, intervals: [500, 1_000, 2_000] },
        )
        .toBeGreaterThan(0);
}

/** Org-management list surfaces are heavier (more rows/tabs); allow a longer settle window. */
export const ORG_LIST_ROW_TIMEOUT = 120_000;

async function consumeListResponseProbe(
    page: PlaywrightPage,
): Promise<{ status: number; elapsedMs: number } | null> {
    const probe = pendingResponseProbe.get(page);
    if (!probe) {
        return null;
    }

    pendingResponseProbe.delete(page);
    return probe;
}

export function registerListFilterHandler(
    network: NetworkFixture,
    pageContext: PageContext,
    resolver: Parameters<typeof http.get>[1],
): void {
    const { filterUrl } = getFilterConfig(pageContext);
    network.use(http.get(filterUrl, resolver), http.post(filterUrl, resolver));
}

export async function navigateToList(
    page: PlaywrightPage,
    pageContext: PageContext,
    testInfo: TestInfo,
): Promise<void> {
    pageContext.setListSurface("list");
    ensureListResponseTracking(page, pageContext);
    const { listPath, filterApi } = getListConfig(pageContext);
    // Escape regex-special chars so the path is matched literally as a substring.
    const listUrlRegex = new RegExp(listPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto(listPath, { waitUntil: "domcontentloaded", timeout: 45_000 });
            await page.waitForURL(listUrlRegex, { timeout: 20_000 });

            // Dismiss the Tencent workbench panel (if it mounts) before touching the toolbar.
            await dismissTencentWorkbenchIfPresent(page);

            const detailPanel = new DetailPanelComponent(page);
            if (await detailPanel.isVisible()) {
                await detailPanel.close();
            }

            await page.keyboard.press("Escape");
            // Filter/search/sort/pipeline state persists in URL — clear after every navigation.
            await ensureListPageCleanState(page, filterApi);

            if (pageContext.currentPage === "survey-template-manager") {
                const templateCards = page.locator('ul.h-full.space-y-3 > li > [role="button"][aria-pressed]');
                await expect.poll(() => templateCards.count(), { timeout: 45_000 }).toBeGreaterThan(0);
            } else {
                await waitForListTableRows(page, filterApi);
            }
            return;
        } catch (error) {
            if (attempt === 3) {
                throw error;
            }
            // Transient route hang (e.g. a lazy route chunk failed to load, leaving the
            // global "Loading…" spinner up) — reload and retry rather than failing.
            await page.reload({ waitUntil: "domcontentloaded" }).catch(() => { });
        }
    }
}

export async function waitForMocked500(
    page: PlaywrightPage,
    pageContext: PageContext,
): Promise<boolean> {
    const recent500 = recentListResponses(page, pageContext).some((entry) => entry.status >= 500);
    if (recent500) {
        return true;
    }

    const probe = await consumeListResponseProbe(page);
    if (probe?.status && probe.status >= 500) {
        return true;
    }

    return page
        .waitForResponse(
            (response) => {
                const url = response.url();
                return isListApiUrl(url, pageContext) && response.status() >= 500;
            },
            { timeout: 20_000 },
        )
        .then(() => true)
        .catch(() => false);
}

export async function waitForDelayedListResponse(
    page: PlaywrightPage,
    pageContext: PageContext,
    minDelayMs: number,
): Promise<boolean> {
    const probe = await consumeListResponseProbe(page);
    if (probe && probe.elapsedMs >= minDelayMs) {
        return true;
    }

    // Probe missing or too fast (e.g. caught a prefetch). Wait for the next matching
    // response and require that wait itself to span the minimum delay.
    const started = Date.now();
    const responseSeen = await page
        .waitForResponse((response) => isListApiUrl(response.url(), pageContext), {
            timeout: Math.max(30_000, minDelayMs + 10_000),
        })
        .then(() => true)
        .catch(() => false);

    if (!responseSeen) {
        return false;
    }

    return Date.now() - started >= minDelayMs;
}

export function registerListDetail500(
    network: NetworkFixture,
    pageContext: PageContext,
): void {
    const { detailUrl } = getListConfig(pageContext);
    network.use(
        http.get(detailUrl, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
}

export function registerListDetailHandler(
    network: NetworkFixture,
    pageContext: PageContext,
    resolver: Parameters<typeof http.get>[1],
): void {
    const { detailUrl } = getListConfig(pageContext);
    network.use(http.get(detailUrl, resolver));
}
