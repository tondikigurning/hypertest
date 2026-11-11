import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class CasesBulkPage {
  static readonly CASES_BULK_PATH = "/case-management/cases/bulk";

  constructor(private readonly page: Page) {}

  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 }).first();
  }

  private get wizardTitle(): Locator {
    return this.page.getByText("Bulk Action", { exact: true }).first();
  }

  private get wizardRoot(): Locator {
    return this.page.locator("div").filter({ hasText: "Bulk Action" }).first();
  }

  private get summaryPanel(): Locator {
    return this.page.getByText("Summary", { exact: true }).first();
  }

  private get nextButton(): Locator {
    return this.page.getByRole("button", { name: /^Next$/ }).first();
  }

  private get backButton(): Locator {
    return this.page.getByRole("button", { name: /^Back$/ }).first();
  }

  private get applyButton(): Locator {
    return this.page.getByRole("button", { name: /Apply Bulk Operation/i }).first();
  }

  private get cancelHeaderButton(): Locator {
    return this.page.getByRole("button", { name: /^Cancel$/ }).first();
  }

  private get downloadTemplateButton(): Locator {
    return this.page.getByRole("button", { name: /Download Template/i }).first();
  }

  private get fileUploadRoot(): Locator {
    return this.page.locator('[data-testid="file-upload"], input[type="file"]').first();
  }

  private get fileInput(): Locator {
    return this.page.locator('input[type="file"]').first();
  }

  private bulkActionCard(action: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(action, "i") }).first();
  }

  private get completedHeading(): Locator {
    return this.page.getByText("Bulk Update Queued for Processing", { exact: true }).first();
  }

  private get alert(): Locator {
    return this.page.getByRole("heading", { name: /Bulk Dispatch Cases/i }).first();
  }

  async navigateTo(): Promise<void> {
    await this.page.goto(CasesBulkPage.CASES_BULK_PATH, { waitUntil: "domcontentloaded" });
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL(/\/case-management\/cases\/bulk/, { timeout: 30_000 });
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await this.expectWizardVisible();
  }

  async expectVisible(): Promise<void> {
    await this.expectWizardVisible();
  }

  async expectWizardVisible(): Promise<void> {
    await expect(this.wizardTitle).toBeVisible({ timeout: 20_000 });
  }

  async expectWizardStepsVisible(): Promise<void> {
    await expect(this.page.getByText("Action", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText("Upload File List", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(this.page.getByText("Completed", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  }

  async expectSummaryPlaceholders(): Promise<void> {
    await expect(this.summaryPanel).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText("No targets specified yet", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(this.page.getByText("No file uploaded yet", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectSummarySelectedAction(expected: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(expected, "i")).first()).toBeVisible({ timeout: 20_000 });
  }

  // ── action step ────────────────────────────────────────────────────────

  async expectActionStepVisible(): Promise<void> {
    await expect(this.page.getByText("Choose Action to Apply", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectActionVisible(action: string): Promise<void> {
    await expect(this.bulkActionCard(action)).toBeVisible({ timeout: 20_000 });
  }

  async selectBulkAction(action: string): Promise<void> {
    const card = this.bulkActionCard(action);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();
  }

  async expectNextDisabled(): Promise<void> {
    await expect(this.nextButton).toBeDisabled({ timeout: 20_000 });
  }

  async expectNextEnabled(): Promise<void> {
    await expect(this.nextButton).toBeEnabled({ timeout: 20_000 });
  }

  async clickNext(): Promise<void> {
    // The wizard's Next is either "Next" (step 1) or "Apply Bulk Operation" is handled separately.
    const next = this.nextButton;
    await expect(next).toBeEnabled({ timeout: 20_000 });
    await next.click();
  }

  async clickBack(): Promise<void> {
    await expect(this.backButton).toBeVisible({ timeout: 20_000 });
    await this.backButton.click();
  }

  // ── upload step ────────────────────────────────────────────────────────

  async expectUploadStepVisible(): Promise<void> {
    await expect(this.page.getByText("Upload File List", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
    // The step description
    await expect(this.page.getByText("Provide valid case IDs bulk files.", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectDownloadTemplateVisible(): Promise<void> {
    await expect(this.downloadTemplateButton).toBeVisible({ timeout: 20_000 });
  }

  async expectFileUploadVisible(): Promise<void> {
    // FileUpload renders a dropzone with text or an input[type=file]
    await expect(this.page.getByText(/Structured Import Template/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // At least the file input exists in the DOM
    await expect(this.fileInput).toBeAttached({ timeout: 20_000 });
  }

  async expectApplyDisabled(): Promise<void> {
    await expect(this.applyButton).toBeDisabled({ timeout: 20_000 });
  }

  async expectApplyEnabled(): Promise<void> {
    await expect(this.applyButton).toBeEnabled({ timeout: 20_000 });
  }

  async uploadValidCsv(): Promise<void> {
    const csvContent = "Case Number,Remarks\nHS-TEST-001,bulk test\n";
    const file = {
      name: "bulk-test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    };
    // Ensure the file input is present and set the file
    await this.fileInput.waitFor({ state: "attached", timeout: 10_000 });
    await this.fileInput.setInputFiles(file);
    // The FileUpload should show the file name in the summary or in the uploader
    await expect(this.page.getByText("bulk-test.csv", { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async clickApply(): Promise<void> {
    await expect(this.applyButton).toBeEnabled({ timeout: 20_000 });
    await this.applyButton.click();
  }

  async expectErrorAlertVisible(): Promise<void> {
    await expect(this.alert).toBeVisible({ timeout: 20_000 });
  }

  async expectCompletedVisible(): Promise<void> {
    await expect(this.completedHeading).toBeVisible({ timeout: 30_000 });
  }

  async expectCancelVisible(): Promise<void> {
    // Header Cancel navigates back to /case-management/cases
    await expect(this.cancelHeaderButton).toBeVisible({ timeout: 20_000 });
  }

  async clickCancel(): Promise<void> {
    await this.cancelHeaderButton.click();
    await this.page.waitForURL(/\/case-management\/cases(\?|$)/, { timeout: 20_000 });
  }
}
