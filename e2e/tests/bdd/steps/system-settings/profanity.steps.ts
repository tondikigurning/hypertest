import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { http, HttpResponse, delay as mswDelay } from "msw";
import { expect, test } from "../../fixtures/base.fixture";
import {
    PROFANITY_FILTER_SETTING_API,
    PROFANITY_WORD_BY_UUID_API,
    PROFANITY_WORDS_FILTER_URL,
} from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

// ─── Navigation ─────────────────────────────────────────────────────────

Given("the user is on the profanity settings page", async ({ profanityPage }) => {
    await profanityPage.navigateTo();
});

Given("the user is on the system settings policies page", async ({ page }) => {
    await page.goto("/system-settings/policies", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/system-settings\/policies/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
});

When("the user opens {string} from the system settings sidebar", async ({ profanityPage }, label: string) => {
    await profanityPage.openFromSystemSettingsSidebar(label);
});

Then("the profanity settings page is visible", async ({ page, profanityPage }) => {
    await expect(page).toHaveURL(/\/system-settings\/profanity(?:\?|$)/, { timeout: 30_000 });
    await profanityPage.expectPageLoaded();
});

// ─── Page shell ─────────────────────────────────────────────────────────

Then("the profanity filter card is visible", async ({ profanityPage }) => {
    await profanityPage.expectFilterCardVisible();
});

Then("the profanity filter status is shown", async ({ profanityPage }) => {
    await profanityPage.expectFilterStatusShown();
});

Then(/^the manage word\/phrase action is visible$/, async ({ profanityPage }) => {
    await profanityPage.expectManageActionVisible();
});

// ─── Word list ──────────────────────────────────────────────────────────

When(/^the user opens the manage word\/phrase panel$/, async ({ profanityPage }) => {
    await profanityPage.openManagePanel();
});

Given(/^the manage word\/phrase panel is open$/, async ({ profanityPage }) => {
    await profanityPage.openManagePanel();
});

Then("the profanity word list table is visible", async ({ profanityPage }) => {
    await profanityPage.expectWordListVisible();
});

Then("the profanity word list shows the {string} column", async ({ profanityPage }, column: string) => {
    await profanityPage.expectColumnVisible(column);
});

Then("custom word rows show the edit and delete actions", async ({ profanityPage }) => {
    await profanityPage.expectCustomRowsHaveActions();
});

Then("default word rows show no row actions", async ({ profanityPage, $testInfo }) => {
    const hasDefaultRows = await profanityPage.expectDefaultRowsReadOnly();
    if (!hasDefaultRows) {
        ($testInfo as TestInfo).skip(true, "Environment has no default profanity words to inspect.");
    }
});

// ─── Search / filter / sort ─────────────────────────────────────────────

When("the user searches the profanity word list for the first visible word", async ({ profanityPage }) => {
    const word = await profanityPage.getFirstVisibleWord();
    await profanityPage.searchWordsKeep(word);
});

When("the user searches the profanity word list for a value that matches no word", async ({ profanityPage }) => {
    await profanityPage.searchWordsKeep(`E2E-NO-MATCH-${Date.now()}`);
});

When("the user searches the profanity word list for {string}", async ({ profanityPage }, value: string) => {
    await profanityPage.searchWordsKeep(value);
});

Then("the profanity word list shows only matching words", async ({ profanityPage }) => {
    await profanityPage.expectOnlyMatchingWordsVisible();
});

Then("the profanity word list shows the empty state", async ({ profanityPage }) => {
    await profanityPage.expectEmptyState();
});

Then("the profanity word list shows an error state", async ({ profanityPage }) => {
    await profanityPage.expectWordListErrorState();
});

Then("a loading indicator is visible in the word list before the results load", async ({ profanityPage }) => {
    await profanityPage.expectWordListLoadingState();
});

When("the user applies the {string} filter with the first visible word", async ({ profanityPage }, _label: string) => {
    const word = await profanityPage.getFirstVisibleWord();
    await profanityPage.applyWordFilter(word);
});

Then("the filtered profanity words contain the selected word", async ({ profanityPage }) => {
    await profanityPage.expectFilterResultsContainSelectedWord();
});

When(
    "the user applies the {string} sort in ascending and descending order",
    async ({ profanityPage }, _label: string) => {
        await profanityPage.sortWordsBothDirections();
    },
);

Then("each profanity word sort request returns HTTP 200", async ({ profanityPage }) => {
    await profanityPage.expectWordSortRequestsSucceeded();
});

Then("the word list is returned in the requested order", async ({ profanityPage }) => {
    await profanityPage.expectWordSortOrder();
});

// ─── Pagination ─────────────────────────────────────────────────────────

Given("the profanity word list has more than one page", async ({ profanityPage, $testInfo }) => {
    if (!(await profanityPage.hasMoreThanOnePage())) {
        ($testInfo as TestInfo).skip(true, "Environment has a single page of profanity words.");
    }
});

When("the user goes to the next profanity word list page", async ({ profanityPage }) => {
    await profanityPage.goToNextPage();
});

When("the user goes to the previous profanity word list page", async ({ profanityPage }) => {
    await profanityPage.goToPreviousPage();
});

Then("the previous profanity word list page action is enabled", async ({ profanityPage }) => {
    await profanityPage.expectPreviousPageEnabled();
});

Then("the previous profanity word list page action is disabled", async ({ profanityPage }) => {
    await profanityPage.expectPreviousPageDisabled();
});

// ─── Filter toggle ──────────────────────────────────────────────────────

Given("the profanity filter status is recorded", async ({ profanityPage }) => {
    await profanityPage.recordFilterStatus();
});

When("the user toggles the profanity filter switch", async ({ profanityPage }) => {
    await profanityPage.toggleFilter();
});

Then("the profanity filter confirmation dialog is visible", async ({ profanityPage }) => {
    await profanityPage.expectFilterConfirmationVisible();
});

Then("the profanity filter confirmation dialog is not visible", async ({ profanityPage }) => {
    await profanityPage.expectFilterConfirmationHidden();
});

When("the user confirms the profanity filter change", async ({ profanityPage }) => {
    await profanityPage.confirmFilterChange();
});

When("the user cancels the profanity filter confirmation", async ({ profanityPage }) => {
    await profanityPage.cancelFilterChange();
});

Then("the profanity filter success toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectFilterSuccessToast();
});

Then("the profanity filter error toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectFilterErrorToast();
});

Then("the profanity filter status is the opposite of the recorded status", async ({ profanityPage }) => {
    await profanityPage.expectFilterStatusOppositeOfRecorded();
});

Then("the profanity filter status matches the recorded status", async ({ profanityPage }) => {
    await profanityPage.expectFilterStatusMatchesRecorded();
});

// ─── Create ─────────────────────────────────────────────────────────────

When("the user creates a profanity word with a unique E2E value", async ({ profanityPage }) => {
    await profanityPage.createUniqueE2EWord();
});

Then("the profanity word created toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectWordCreatedToast();
});

Then("the created profanity word appears in the word list", async ({ profanityPage }) => {
    await profanityPage.expectCreatedWordVisible();
});

Then("the profanity add word input is empty", async ({ profanityPage }) => {
    await profanityPage.expectAddWordInputEmpty();
});

When("the user enters a profanity word containing invalid characters", async ({ profanityPage }) => {
    await profanityPage.enterAddWord("bad*word");
});

Then("the profanity add word input is marked invalid", async ({ profanityPage }) => {
    await profanityPage.expectAddWordInputInvalid();
});

Then("the add word action is disabled", async ({ profanityPage }) => {
    await profanityPage.expectAddWordDisabled();
});

// ─── Edit ───────────────────────────────────────────────────────────────

Given("an E2E profanity word is available", async ({ profanityPage }) => {
    await profanityPage.ensureE2EWordAvailable();
});

When("the user opens the edit dialog for the first E2E word", async ({ profanityPage }) => {
    await profanityPage.openEditForFirstE2EWord();
});

When("the user cancels the edit word dialog", async ({ profanityPage }) => {
    await profanityPage.cancelEditDialog();
});

Then("the edit word dialog is not visible", async ({ profanityPage }) => {
    await profanityPage.expectEditDialogHidden();
});

Then("the word is unchanged in the word list", async ({ profanityPage }) => {
    await profanityPage.expectSelectedWordUnchanged();
});

When("the user updates the word to a new unique E2E value", async ({ profanityPage }) => {
    await profanityPage.updateWordToNewE2EValue();
});

Then("the profanity word updated toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectWordUpdatedToast();
});

Then("the updated profanity word appears in the word list", async ({ profanityPage }) => {
    await profanityPage.expectUpdatedWordVisible();
});

When("the user enters an invalid profanity word in the edit dialog", async ({ profanityPage }) => {
    await profanityPage.enterInvalidEditWord();
});

Then("the edit word form shows the invalid word message", async ({ profanityPage }) => {
    await profanityPage.expectEditInvalidWordMessage();
});

Then("the update word action is disabled", async ({ profanityPage }) => {
    await profanityPage.expectUpdateWordDisabled();
});

// ─── Delete ─────────────────────────────────────────────────────────────

When("the user opens the delete confirmation for the first E2E word", async ({ profanityPage }) => {
    await profanityPage.openDeleteForFirstE2EWord();
});

Then("the delete profanity word confirmation is visible", async ({ profanityPage }) => {
    await profanityPage.expectDeleteConfirmationVisible();
});

When("the user cancels the delete profanity word confirmation", async ({ profanityPage }) => {
    await profanityPage.cancelDeleteWord();
});

Then("the delete profanity word confirmation is not visible", async ({ profanityPage }) => {
    await profanityPage.expectDeleteConfirmationHidden();
});

Then("the word remains in the word list", async ({ profanityPage }) => {
    await profanityPage.expectSelectedWordRemains();
});

When("the user confirms the delete profanity word", async ({ profanityPage }) => {
    await profanityPage.confirmDeleteWord();
});

Then("the profanity word deleted toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectWordDeletedToast();
});

Then("the deleted profanity word is no longer in the word list", async ({ profanityPage }) => {
    if (!profanityPage.selectedWord) {
        throw new Error("No profanity word was selected for deletion.");
    }
    await profanityPage.expectWordAbsent(profanityPage.selectedWord);
});

Then("the profanity word delete error toast is shown", async ({ profanityPage }) => {
    await profanityPage.expectWordDeleteErrorToast();
});

// ─── MSW handlers ───────────────────────────────────────────────────────

Given("the profanity word list API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(PROFANITY_WORDS_FILTER_URL, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the profanity word list API response is delayed by 4 seconds", async ({ network }) => {
    network.use(
        http.post(PROFANITY_WORDS_FILTER_URL, async () => {
            await mswDelay(4_000);
            return HttpResponse.json({ rows: [], pagination: { total_items: 0 } });
        }),
    );
});

Given("the profanity filter update API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(PROFANITY_FILTER_SETTING_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the profanity word delete API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.delete(PROFANITY_WORD_BY_UUID_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});
