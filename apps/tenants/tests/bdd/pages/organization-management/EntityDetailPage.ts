/** POM — Entity detail sidebar tabs within an organization (/organization-management/{orgId}/entities/{entityId}). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { OrgDetailPanelComponent } from "../../components/OrgDetailPanelComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";

export class EntityDetailPage {
    readonly detailPanel: OrgDetailPanelComponent;
    readonly table: DataTableComponent;
    readonly confirmModal: ConfirmModalComponent;
    readonly responseModal: ResponseModalComponent;

    constructor(private readonly page: Page) {
        this.detailPanel = new OrgDetailPanelComponent(page);
        this.table = new DataTableComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    async navigateTo(orgId: string, entityId: string): Promise<void> {
        await this.page.goto(`/organization-management/${orgId}/entities/${entityId}`, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
    }

    async clickTab(tabName: string): Promise<void> {
        await this.detailPanel.clickTab(tabName);
    }

    async expectTabVisible(tabName: string): Promise<void> {
        await this.detailPanel.expectTabVisible(tabName);
    }

    async expectTabContentVisible(tabName: string): Promise<void> {
        await this.detailPanel.expectTabContentVisible(tabName);
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanel.close();
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/organization-management\/[^/]+\/entities\/[^/]+/, { timeout: 60_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 60_000 });
        await this.detailPanel.expectVisible();
    }

    async expectDetailPanelHasTitle(): Promise<void> {
        await this.detailPanel.expectHasTitle();
    }
}
