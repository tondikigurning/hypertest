import type { Locator, Page, Response } from "@playwright/test";
import { parseAriaLabelToISODate } from "./filter-utils";

type WaitFn = (endpoint: string, timeout?: number) => Promise<Response | null>;

export async function navigateCalendarToDate(
    page: Page,
    calendar: Locator,
    targetDateISO: string,
): Promise<Locator> {
    const [tyyyy, tmm] = targetDateISO.split("-").map(Number);
    for (let attempt = 0; attempt < 24; attempt++) {
        const dayButtons = await calendar.locator('button[aria-label*=","]').all();
        for (const btn of dayButtons) {
            const label = await btn.getAttribute("aria-label").catch(() => null);
            if (label && parseAriaLabelToISODate(label) === targetDateISO) return btn;
        }
        const firstLabel = await calendar
            .locator('button[aria-label*=","]')
            .first()
            .getAttribute("aria-label")
            .catch(() => null);
        if (!firstLabel) break;
        const firstIso = parseAriaLabelToISODate(firstLabel);
        if (!firstIso) break;
        const [fyyyy, fmm] = firstIso.split("-").map(Number);
        const navBtns = calendar.locator('button:not([aria-label*=","])');
        await (tyyyy * 12 + tmm > fyyyy * 12 + fmm ? navBtns.last() : navBtns.first()).click();
        await page.waitForTimeout(300);
    }
    return calendar.locator('button[aria-label*=","]').first();
}

export async function applyDateValue(
    page: Page,
    waitFn: WaitFn,
    dateBtn: Locator,
    endpoint: string,
    targetDateISO?: string,
): Promise<{ apiPromise: Promise<Response | null>; selectedValue: string | null }> {
    await dateBtn.click();
    const calendar = page.getByTestId("calendar-date-input");
    await calendar.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

    const finalTargetDate = targetDateISO || new Date().toISOString().split("T")[0];
    let targetBtn = await navigateCalendarToDate(page, calendar, finalTargetDate);

    if (!(await targetBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        targetBtn = calendar.locator('button[aria-current="date"]').first();
    }

    if (!(await targetBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        return { apiPromise: Promise.resolve(null), selectedValue: null };
    }

    const ariaLabel = await targetBtn.getAttribute("aria-label").catch(() => null);
    const selectedValue = ariaLabel ? parseAriaLabelToISODate(ariaLabel) : finalTargetDate;
    const apiPromise = waitFn(endpoint);
    await targetBtn.click();

    return { apiPromise, selectedValue };
}

export async function applyEnumValue(
    page: Page,
    waitFn: WaitFn,
    enumBtn: Locator,
    endpoint: string,
    providedValue?: string,
): Promise<{ apiPromise: Promise<Response | null>; selectedValue: string | null }> {

    // First, check if we're working with the new filter builder pattern
    const isBuilderPattern = await page.getByTestId("btn-builder-add-filter").isVisible({ timeout: 2000 }).catch(() => false);

    if (isBuilderPattern) {
        const enumContainer = page.locator('div[aria-haspopup="dialog"]').filter({ hasText: "Search for an item" });
        const enumSearch = page.getByPlaceholder("Search for an item").or(page.getByTestId("input-enum-search"));

        await enumContainer.click().catch(() => enumSearch.click());
        await page.waitForTimeout(500);

        // Only fill search input if a specific value is provided
        if (providedValue) {
            await enumSearch.fill(providedValue);
            await page.waitForTimeout(800);
        }

        try {
            const dropdownContainer = page.locator('div.max-h-75.overflow-y-auto').or(page.locator('[role="listbox"]'));
            await dropdownContainer.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

            const options = page.locator('[role="option"]');

            // If we have a specific value, try to find and click it
            if (providedValue) {
                const specificOption = options.filter({ hasText: providedValue }).first();
                const count = await specificOption.count();

                if (count > 0) {
                    const optionText = await specificOption.textContent() ?? providedValue;
                    await specificOption.click();
                    const apiPromise = waitFn(endpoint);

                    const addFilterBtn = page.getByTestId("btn-builder-add-filter");
                    await addFilterBtn.click();

                    return { apiPromise, selectedValue: optionText };
                }
            }

            // Always fall back to first available option (data-driven approach)
            const firstOption = options.first();
            const optionText = await firstOption.textContent() ?? null;
            await firstOption.click();

            const apiPromise = waitFn(endpoint);

            const addFilterBtn = page.getByTestId("btn-builder-add-filter");
            await addFilterBtn.click();

            return { apiPromise, selectedValue: optionText };

        } catch (error) {
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            return { apiPromise: Promise.resolve(null), selectedValue: null };
        }
    } else {
        await enumBtn.click();
        const enumSearch = page.getByTestId("input-enum-search");
        await enumSearch.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

        if (providedValue) {
            await enumSearch.fill(providedValue);
            await page.waitForTimeout(500);
        }

        const apiPromise = waitFn(endpoint);

        const result = await page.evaluate(async (expected: string | null) => {
            const search = document.querySelector('[data-testid="input-enum-search"]');
            if (!search) return { found: false, text: null as string | null };

            const optionsList = search.parentElement?.parentElement?.nextElementSibling;
            if (!optionsList) return { found: false, text: null as string | null };

            const deadline = Date.now() + 3_000;
            let chosen: Element | null = null;

            while (Date.now() < deadline) {
                const opts = Array.from(optionsList.querySelectorAll("div.cursor-pointer, [role=\"option\"], button"));
                if (opts.length > 0) {
                    const exact = expected
                        ? opts.find((o) => o.textContent?.trim().toLowerCase() === expected.toLowerCase())
                        : null;
                    chosen = exact ?? opts[0] ?? null;
                    break;
                }
                await new Promise((r) => setTimeout(r, 100));
            }

            if (!chosen) return { found: false, text: null as string | null };

            const text = chosen.textContent?.trim() ?? null;
            (chosen as HTMLElement).click();
            return { found: true, text };
        }, providedValue ?? null);

        if (!result.found) {
            await page.keyboard.press("Escape");
            return { apiPromise: Promise.resolve(null), selectedValue: null };
        }

        return { apiPromise, selectedValue: result.text };
    }
}
