import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import type { CasesPage } from "./CasesPage";

/** Bulk preparation only. This object deliberately has no operation-submission method. */
export class CasesBulkPage {
    private selectedFile = "";
    private downloadedCsv = "";

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}

    private get apply(): Locator {
        return this.page.getByRole("button", { name: "Apply Bulk Operation", exact: true });
    }

    async open(): Promise<void> {
        await this.cases.navigateTo();
        await this.page.getByRole("button", { name: "Open menu", exact: true }).click();
        await this.page.getByRole("menuitem", { name: "Bulk", exact: true }).click();
        await expect(this.page.getByRole("heading", { name: "Choose Action to Apply" })).toBeVisible();
    }

    async selectAction(action: "Resolve" | "Close"): Promise<void> {
        await this.page.getByRole("button").filter({ has: this.page.getByText(action, { exact: true }) }).click();
    }

    async continueToUpload(action: "Resolve" | "Close"): Promise<void> {
        await this.selectAction(action);
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(this.page.getByRole("heading", { name: "Upload File List", exact: true })).toBeVisible();
    }

    async back(): Promise<void> { await this.page.getByRole("button", { name: "Back", exact: true }).click(); }
    async cancel(): Promise<void> { await this.page.getByRole("button", { name: "Cancel", exact: true }).click(); }
    async expectList(): Promise<void> { await expect(this.page.getByTestId("filter-search-input")).toBeVisible(); }
    async expectNextDisabled(): Promise<void> { await expect(this.page.getByRole("button", { name: "Next", exact: true })).toBeDisabled(); }
    async expectApplyEnabled(enabled: boolean): Promise<void> {
        if (enabled) await expect(this.apply).toBeEnabled();
        else await expect(this.apply).toBeDisabled();
    }
    async expectAction(action: "Closed" | "Resolved"): Promise<void> {
        const summary = this.page.getByText("BULK ACTION SELECTED", { exact: true }).locator("..");
        await expect(summary.getByText(action, { exact: true })).toBeVisible();
    }

    async downloadTemplate(): Promise<void> {
        const [download] = await Promise.all([
            this.page.waitForEvent("download"),
            this.page.getByRole("button", { name: "Download Template", exact: true }).click(),
        ]);
        const path = await download.path();
        if (!path) throw new Error("The bulk template download did not produce a file.");
        this.downloadedCsv = await readFile(path, "utf8");
    }

    expectTemplateColumns(): void {
        expect(this.downloadedCsv.split(/\r?\n/)[0].replace(/^\uFEFF/, "")).toBe("Case Number,Remarks");
    }

    async selectFile(kind: "csv" | "text"): Promise<void> {
        this.selectedFile = kind === "csv" ? "case-bulk-headers.csv" : "case-bulk-invalid.txt";
        const input = this.page.locator('input[type="file"]');
        await expect(input).toHaveCount(1);
        await input.setInputFiles({
            name: this.selectedFile,
            mimeType: kind === "csv" ? "text/csv" : "text/plain",
            buffer: Buffer.from(kind === "csv" ? "Case Number,Remarks\r\n" : "not a csv"),
        });
    }

    async expectSelectedFile(): Promise<void> {
        if (!this.selectedFile) throw new Error("No synthetic file was selected.");
        await expect(this.page.getByText(this.selectedFile, { exact: true }).last()).toBeVisible();
    }
    async removeSelectedFile(): Promise<void> {
        if (!this.selectedFile) throw new Error("No synthetic file was selected.");
        await this.page.getByRole("button", { name: `Remove ${this.selectedFile}`, exact: true }).click();
    }
    async expectNoFile(): Promise<void> { await expect(this.page.getByText("No file uploaded yet", { exact: true })).toBeVisible(); }
    async expectFileError(visible: boolean, message = "File has an unsupported file type"): Promise<void> {
        const error = this.page.getByText(message, { exact: true });
        if (visible) await expect(error).toBeVisible();
        else await expect(error).toHaveCount(0);
    }
}
