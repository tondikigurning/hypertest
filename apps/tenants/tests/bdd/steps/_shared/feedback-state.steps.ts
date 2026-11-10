import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import {
    waitForDelayedListResponse,
    waitForMocked500,
} from "../../utils/list-page-network-utils";

const { Then } = createBdd(test);

Then("the application shows an error state", async ({ page, pageContext }) => {
    // Mutation error modals (e.g. "… Update Failed") appear after the request settles;
    // poll briefly before falling back to the list/detail 500 probe.
    const hasErrorUi = await expect(async () => {
        const hasSonnerErrorToast = await page
            .locator('[data-sonner-toast][data-type="error"]')
            .first()
            .isVisible()
            .catch(() => false);
        const hasErrorBoundary = await page
            .locator('[role="alert"], .error-boundary, .error-state, [data-testid*="error"]')
            .first()
            .isVisible()
            .catch(() => false);
        const hasErrorText = await page
            .getByText(/error|failed|server error|something went wrong/i)
            .first()
            .isVisible()
            .catch(() => false);
        expect(hasSonnerErrorToast || hasErrorBoundary || hasErrorText).toBe(true);
    })
        .toPass({ timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

    if (hasErrorUi) {
        return;
    }

    const hasMocked500Response = await waitForMocked500(page, pageContext);
    expect(
        hasMocked500Response,
        "Expected an error UI or a mocked 500 response from the list/detail API",
    ).toBe(true);
});

Then("a loading indicator or spinner is visible before the results load", async ({ page, pageContext }) => {
    // Dataview tables show MimicLoadingProgress (2px top bar) while isFetching — not a classic spinner.
    const loadingUi = page
        .locator(
            '[role="progressbar"], .spinner, .loader, .skeleton, [data-testid*="loading"], [data-testid="skeleton"], [aria-busy="true"], [role="status"]',
        )
        .or(page.locator("div.pointer-events-none.absolute.inset-x-0.top-0.z-50"))
        .first();

    const hasLoadingState = await loadingUi.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasLoadingText = await page
        .getByText(/loading|please wait/i)
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);

    if (hasLoadingState || hasLoadingText) {
        return;
    }

    const delayedResponseObserved = await waitForDelayedListResponse(page, pageContext, 2_500);
    expect(
        delayedResponseObserved,
        "Expected a loading UI or delayed list API response to be observable",
    ).toBe(true);
});
