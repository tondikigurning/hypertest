import { expect, type Locator, type Page } from "@playwright/test";
import { CasesPrerequisiteError, type CasesPage } from "./CasesPage";

type Drawer = "i-hourglass-high" | "i-truck-delivery" | "i-file-stack";

/** Read-only case history and integration evidence; never submits a business action. */
export class CasesEvidencePage {
    private caseNumber = "";
    private historyTarget = "";

    constructor(private readonly page: Page, private readonly cases: CasesPage) {}

    private async drawer(icon: Drawer, title: string): Promise<Locator> {
        const heading = this.page.getByText(title, { exact: true });
        if (!(await heading.isVisible().catch(() => false))) {
            await this.page.locator("button").filter({ has: this.page.locator(`i.${icon}`) }).click();
        }
        await expect(heading).toBeVisible();
        return heading.locator("../..");
    }

    private async filter(field: "Case Flag" | "SLA Status", value: string): Promise<void> {
        await this.page.getByTestId("btn-add-filter").click();
        await this.page.getByRole("button", { name: field, exact: true }).click();
        const input = this.page.getByRole("textbox", { name: "Search for an item" });
        await input.fill(value);
        await this.page.getByRole("option", { name: value, exact: true }).click();
        await this.page.keyboard.press("Escape");
    }

    private field(label: string): Locator {
        return this.page.getByRole("term").filter({ has: this.page.getByText(label, { exact: true }) }).first().locator("../..").getByRole("definition");
    }

    async prepareSla(kind: "active" | "closed" | "escalated" | "multi-team" | "breached"): Promise<void> {
        await this.cases.navigateTo();
        if (kind === "closed") await this.cases.selectOtherPipeline("Closed");
        else if (kind === "active") await this.cases.selectPipeline("In Progress");
        else {
            await this.cases.selectPipeline("All");
            await this.filter(kind === "breached" ? "SLA Status" : "Case Flag", kind === "breached" ? "Breached" : "Escalated");
        }
        this.caseNumber = await this.cases.openFirstVisibleReadOnlyCase();
        if (["escalated", "multi-team", "breached"].includes(kind)) {
            if (!(await this.field("Case Flag").getByText("Escalated", { exact: true }).isVisible().catch(() => false))) {
                throw new CasesPrerequisiteError("The sampled case does not display the Escalated flag.");
            }
        }
        if (kind !== "escalated") {
            const root = await this.drawer("i-hourglass-high", "SLA Usage History");
            if (!(await root.getByText(/^TOTAL SLA:\s*(?!-\s*$).+/).isVisible().catch(() => false))) {
                throw new CasesPrerequisiteError("The sampled case has no recorded SLA total.");
            }
            if (kind === "multi-team" && await this.teamEntries(root).count() < 2) {
                throw new CasesPrerequisiteError("The sampled case does not have usage for multiple teams.");
            }
            if (kind === "breached" && !(await root.getByText(/^Overdue:/).isVisible().catch(() => false))) {
                throw new CasesPrerequisiteError("The sampled case does not show overdue SLA usage.");
            }
        }
    }

    private teamEntries(root: Locator): Locator {
        return root.getByText("TEAM DETAILS", { exact: true }).locator("..").locator(":scope > div").filter({ has: this.page.locator("p") });
    }

    async openSla(): Promise<void> { await this.drawer("i-hourglass-high", "SLA Usage History"); }
    async expectSlaUsage(includePercentage: boolean): Promise<void> {
        const root = await this.drawer("i-hourglass-high", "SLA Usage History");
        await expect(root.getByText(/^TOTAL SLA:/)).toBeVisible();
        await expect(root.getByText(/^Used:/)).toBeVisible();
        await expect(root.getByText(/^Remaining:/)).toBeVisible();
        if (includePercentage) await expect(root.getByText(/^[\d.]+% Used$/)).toBeVisible();
    }
    async expectTeamUsage(multiple = false): Promise<void> {
        const root = await this.drawer("i-hourglass-high", "SLA Usage History");
        await expect(root.getByText("TEAM DETAILS", { exact: true })).toBeVisible();
        await expect.poll(() => this.teamEntries(root).count()).toBeGreaterThanOrEqual(multiple ? 2 : 1);
    }
    async expectOverduePercentage(): Promise<void> {
        const root = await this.drawer("i-hourglass-high", "SLA Usage History");
        const text = await root.getByText(/^[\d.]+% Used$/).innerText();
        expect(Number.parseFloat(text)).toBeGreaterThan(100);
    }
    async expectOverdue(): Promise<void> { await expect((await this.drawer("i-hourglass-high", "SLA Usage History")).getByText(/^Overdue:\s*\S/)).toBeVisible(); }
    async searchEscalatedPipeline(): Promise<void> {
        if (!this.caseNumber) throw new Error("No escalated case identity was captured.");
        await this.cases.navigateTo();
        await this.cases.selectOtherPipeline("Escalated");
        await this.cases.searchFor(this.caseNumber);
    }
    async expectCaseInPipeline(): Promise<void> {
        if (!this.caseNumber) throw new Error("No escalated case identity was captured.");
        await expect(this.page.getByRole("row").filter({ has: this.page.getByText(this.caseNumber, { exact: true }) })).toHaveCount(1);
    }

    async prepareWorkOrder(kind: "empty" | "linked" | "unassigned"): Promise<void> {
        await this.cases.navigateTo();
        await this.cases.selectPipeline("All");
        if (kind !== "empty") await this.filter("Case Flag", "Endorse to WFM");
        this.caseNumber = await this.cases.openFirstVisibleReadOnlyCase();
        const root = await this.drawer("i-truck-delivery", "Work Orders");
        const empty = root.getByText("Currently there are no work orders related to this case.", { exact: true });
        if (kind === "empty" && !(await empty.isVisible().catch(() => false))) throw new CasesPrerequisiteError("The sampled case has a work order.");
        if (kind !== "empty" && !(await root.getByText(/^WO-/).first().isVisible().catch(() => false))) throw new CasesPrerequisiteError("The sampled case has no visible linked work order.");
        if (kind === "unassigned") {
            const status = root.getByRole("term").filter({ hasText: /^Status$/ }).first().locator("../..").getByRole("definition");
            if ((await status.innerText()).trim() !== "Unassigned") throw new CasesPrerequisiteError("The sampled work order is not unassigned.");
        }
    }
    async openWorkOrders(): Promise<void> { await this.drawer("i-truck-delivery", "Work Orders"); }
    async expectWorkOrderEmpty(message: string): Promise<void> { await expect((await this.drawer("i-truck-delivery", "Work Orders")).getByText(message, { exact: true })).toBeVisible(); }
    async expectWorkOrderReference(): Promise<void> { await expect((await this.drawer("i-truck-delivery", "Work Orders")).getByText(/^WO-/).first()).toBeVisible(); }
    async expectWorkOrderFields(): Promise<void> {
        const root = await this.drawer("i-truck-delivery", "Work Orders");
        for (const name of ["Status", "Priority", "Assigned Technician", "Schedule Date"]) {
            await expect(root.getByRole("term").filter({ hasText: new RegExp(`^${name}$`) }).first()).toBeVisible();
        }
    }
    async expectWorkOrderField(label: string, value: string): Promise<void> {
        const root = await this.drawer("i-truck-delivery", "Work Orders");
        const term = root.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) }).first();
        await expect(term.locator("../..").getByRole("definition")).toHaveText(value);
    }

    async prepareSummary(kind: "history-other" | "history-any" | "child"): Promise<void> {
        await this.cases.openOwnedCase();
        const root = await this.summaryRoot();
        if (kind === "child") {
            if (!(await root.getByText("No child cases found.", { exact: true }).isVisible().catch(() => false))) throw new CasesPrerequisiteError("The sampled case has child cases.");
        } else {
            const buttons = root.getByRole("button").filter({ hasText: /^HS-\d/ });
            const minimum = kind === "history-other" ? 2 : 1;
            if (await buttons.count() < minimum) throw new CasesPrerequisiteError(`The sampled case has fewer than ${minimum} history ticket${minimum === 1 ? "" : "s"}.`);
        }
    }
    private async summaryRoot(): Promise<Locator> {
        await this.drawer("i-file-stack", "Ticket History");
        return this.page.getByText("Ticket History", { exact: true }).locator("../../../../..");
    }
    async openSummary(): Promise<void> { await this.summaryRoot(); }
    async expectHistory(): Promise<void> {
        const root = await this.summaryRoot();
        const buttons = root.getByRole("button").filter({ hasText: /^HS-\d/ });
        await expect.poll(() => buttons.count()).toBeGreaterThanOrEqual(2);
        await expect(buttons.filter({ hasText: "Current" })).toHaveCount(1);
    }
    async openOtherHistoryCase(): Promise<void> {
        const root = await this.summaryRoot();
        const button = root.getByRole("button").filter({ hasText: /^HS-\d/ }).filter({ hasNotText: "Current" }).first();
        const match = (await button.innerText()).match(/HS-\d+-\d+/);
        if (!match) throw new Error("The selected history ticket did not show its case number.");
        this.historyTarget = match[0];
        await button.click();
    }
    async expectHistoryTab(): Promise<void> {
        if (!this.historyTarget) throw new Error("No historical case was selected.");
        await expect(this.page.getByRole("tab", { name: new RegExp(`^${this.historyTarget}\\s`) })).toBeVisible();
    }
    async expectHistoryDetails(): Promise<void> {
        const root = await this.summaryRoot();
        const ticket = root.getByRole("button").filter({ hasText: /^HS-\d/ }).first();
        await expect(ticket).toContainText(/HS-\d+-\d+/);
        await expect(ticket).toContainText(/\d{1,2}\s+\w+\s+\d{4}/);
        const values = (await ticket.locator("p").allTextContents()).map((value) => value.trim()).filter(Boolean);
        expect(values.length).toBeGreaterThanOrEqual(6);
        await expect(ticket).toContainText(/\b(?:Open|Assigned|In Progress|Solved|Closed|Cancelled|Pending Customer Reply)\b/);
    }
    async expectCurrentTicket(): Promise<void> { await expect((await this.summaryRoot()).getByText("Current", { exact: true })).toBeVisible(); }
    async expectNoChildCount(): Promise<void> {
        const root = await this.summaryRoot();
        await expect(root.getByText("Child Case", { exact: true }).locator("..")).toContainText("0");
    }
    async expectSummaryMessage(message: string): Promise<void> { await expect((await this.summaryRoot()).getByText(message, { exact: true })).toBeVisible(); }
}
