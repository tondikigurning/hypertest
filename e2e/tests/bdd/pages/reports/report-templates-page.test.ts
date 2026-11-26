import { strict as assert } from "node:assert";
import { test } from "node:test";
import { chromium } from "@playwright/test";
import { ReportTemplatesPage } from "./ReportTemplatesPage";

test("waits for the list and uses the report selector's text title", { timeout: 20_000 }, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ baseURL: "http://report-fixture.invalid" });
        await page.route("**/reports/templates", (route) => route.fulfill({
            contentType: "text/html",
            body: `<!doctype html><button>Create New</button><script>
                setTimeout(() => {
                    document.body.innerHTML = '<button id="create">Create New</button><input data-testid="filter-search-input"><table><thead><tr><th><button>Report Name</button></th></tr></thead></table>';
                    document.getElementById('create').onclick = () => {
                        document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><div>Select Report Type</div><button id="category">Case Management</button><button disabled>Next</button></div>');
                        document.getElementById('category').onclick = () => document.querySelector('[role="dialog"]').insertAdjacentHTML('beforeend', '<label><input type="radio" name="type">OLA Breached Active Cases</label>');
                    };
                }, 500);
            </script>`,
        }));
        const templates = new ReportTemplatesPage(page);
        await templates.navigate();
        await templates.openCreate();
        await templates.expectNextDisabled();
        await templates.selectCaseType();
        assert.equal(await page.getByRole("radio", { name: "OLA Breached Active Cases" }).isChecked(), true);
    } finally {
        await browser.close();
    }
});

test("clears a retained search and waits for the unfiltered pagination range", { timeout: 20_000 }, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ baseURL: "http://report-fixture.invalid" });
        await page.route("**/reports/templates", (route) => route.fulfill({
            contentType: "text/html",
            body: `<!doctype html><button>Create New</button><input data-testid="filter-search-input" value="retained search"><button data-testid="btn-clear-filters" id="reset">Reset</button><table><thead><tr><th><button>Report Name</button></th></tr></thead></table><div><span id="range">1-1 of 1</span><button aria-label="Previous Page" disabled>Previous</button><button aria-label="Next Page" id="next" disabled>Next</button></div><script>
                document.getElementById('reset').onclick = () => {
                    document.querySelector('[data-testid="filter-search-input"]').value = '';
                    document.getElementById('reset').hidden = true;
                    setTimeout(() => {
                        document.getElementById('range').textContent = '1-50 of 100';
                        document.getElementById('next').disabled = false;
                        document.querySelector('table').insertAdjacentHTML('beforeend', '<tbody><tr><td>Example</td></tr></tbody>');
                    }, 500);
                };
            </script>`,
        }));
        const templates = new ReportTemplatesPage(page);
        await templates.prepareFirstPage();
        assert.equal(await templates.hasNextPage(), true);
    } finally {
        await browser.close();
    }
});

test("does not finish a reset before the populated list is restored", { timeout: 20_000 }, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent(`<input data-testid="filter-search-input" value="E2E"><button data-testid="btn-clear-filters" id="reset">Reset</button><table><tbody><tr><th>Report Name</th></tr></tbody></table><script>
            document.getElementById('reset').onclick = () => {
                document.querySelector('[data-testid="filter-search-input"]').value = '';
                setTimeout(() => document.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><td>Example</td></tr>'), 500);
            };
        </script>`);
        const templates = new ReportTemplatesPage(page);
        await templates.reset();
        assert.equal(await page.getByRole("table").getByRole("row").count(), 2);
    } finally {
        await browser.close();
    }
});
