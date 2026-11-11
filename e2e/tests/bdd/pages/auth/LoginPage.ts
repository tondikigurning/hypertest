import type { Locator, Page } from "@playwright/test";
import { ProfileMenuComponent } from "../../components/ProfileMenuComponent";

export class LoginPage {
    readonly profileMenu: ProfileMenuComponent;

    constructor(private readonly page: Page) {
        this.profileMenu = new ProfileMenuComponent(page);
    }

    private get usernameField(): Locator {
        return this.page.locator('#identifier, input[id="identifier"]').first();
    }

    private get passwordField(): Locator {
        return this.page.locator('#password, input[id="password"]').first();
    }

    private get passwordToggleButton(): Locator {
        return this.page.getByTestId("suffix-icon").first();
    }

    private get loginButton(): Locator {
        return this.page.locator('button[type="submit"]:has-text("Login")').first();
    }

    private get loginForm(): Locator {
        return this.page.locator('form[method="POST"]').first();
    }

    private get invalidCredentialsMessage(): Locator {
        return this.page.locator('div:has-text("Invalid Credentials")').first();
    }

    private get identifierErrorMessage(): Locator {
        return this.page.locator('p[data-testid="error-text"]').first();
    }

    private get passwordErrorMessage(): Locator {
        return this.page.locator('p[data-testid="error-text"]').nth(1);
    }

    private get generalErrorMessage(): Locator {
        return this.page
            .locator(
                [
                    '[role="alert"]',
                    '[data-testid="error"]',
                    ".error-message",
                    ".text-red-500",
                    '[class*="error"]',
                    '[class*="danger"]',
                    '[aria-invalid="true"] + *',
                    '[data-slot="error-message"]',
                ].join(", "),
            )
            .first();
    }

    async gotoLogin(): Promise<void> {
        // Retry on transient navigation failures (slow/unreachable auth host). Rely on the
        // login form becoming visible rather than `networkidle`, which can hang on a slow page.
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await this.page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
                await this.loginForm.waitFor({ state: "visible", timeout: 30_000 });
                return;
            } catch (error) {
                lastError = error as Error;
                if (attempt === 3) break;
                await this.page.waitForTimeout(1_000).catch(() => {});
            }
        }
        throw lastError ?? new Error("Failed to navigate to /login");
    }

    async fillCredentials(username: string, password: string): Promise<void> {
        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
    }

    async submitLogin(): Promise<void> {
        await this.loginButton.click();
    }

    async submitEmptyForm(): Promise<void> {
        await this.loginButton.click();
    }

    async togglePasswordVisibility(): Promise<void> {
        await this.passwordToggleButton.click();
    }

    async login(username: string, password: string): Promise<void> {
        await this.gotoLogin();
        await this.fillCredentials(username, password);
        await this.submitLogin();
    }

    async waitForAuthenticatedRedirect(): Promise<void> {
        // The auth host can be slow to issue the post-login redirect — give it room.
        await this.page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60_000 });
    }

    async waitForAuthenticationError(): Promise<void> {
        await Promise.race([
            this.invalidCredentialsMessage.waitFor({ state: "visible", timeout: 20_000 }),
            this.generalErrorMessage.waitFor({ state: "visible", timeout: 20_000 }),
            this.page.waitForURL(/.*login.*/, { timeout: 20_000 }),
        ]);
    }

    async expectPasswordFieldType(type: "password" | "text"): Promise<void> {
        await this.passwordField.waitFor({ state: "visible" });
        await this.passwordField.evaluate((el, expected) => {
            if ((el as HTMLInputElement).type !== expected) {
                throw new Error(`Expected password input type to be ${expected}`);
            }
        }, type);
    }

    async waitForIdentifierValidationError(): Promise<void> {
        await this.identifierErrorMessage.waitFor({ state: "visible", timeout: 10_000 });
    }

    async waitForPasswordValidationError(): Promise<void> {
        await this.passwordErrorMessage.waitFor({ state: "visible", timeout: 10_000 });
    }
}
