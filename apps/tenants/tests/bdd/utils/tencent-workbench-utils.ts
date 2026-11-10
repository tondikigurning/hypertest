/**
 * Tencent Cloud Contact Center workbench helper.
 *
 * On authenticated pages the app mounts the Tencent workbench panel
 * (`ExtTencentPanel`). Its open/closed state is driven by an `openWorkbench` prop,
 * and the Tencent auth hook flips it open **asynchronously** once the SDK resolves
 * (e.g. to `forced_offline`) — which can land seconds after navigation, while a
 * later step is running. When open the panel sits `position: absolute` over the
 * top-right of the app with `z-index: 49` and `pointer-events: auto`, and the SDK's
 * shadow-DOM modal can steal interactions, destabilising subsequent steps.
 *
 * A one-shot "click the toggle to close it" can't win that race, so instead we
 * inject a persistent stylesheet that forces the panel out of the way for good. The
 * rule matches live, so it neutralises the panel even if it mounts / auto-opens
 * after this runs. The panel is not exercised by any E2E scenario, so hiding it is
 * safe.
 */
import type { Page } from "@playwright/test";

/** Id of the injected style tag (kept stable so we only inject once per document). */
const NEUTRALIZE_STYLE_ID = "e2e-tencent-workbench-neutralize";

/**
 * Hide the Tencent workbench panel entirely. `#tcccdom` is the stable id the SDK
 * renders into; `section:has(#tcccdom)` targets its `ExtTencentPanel` wrapper. The
 * panel is `position: absolute`, so `display: none` removes it from rendering and
 * hit-testing without shifting any layout.
 */
const NEUTRALIZE_CSS = "section:has(#tcccdom){display:none !important;}";

/**
 * Injects a stylesheet that permanently neutralises the Tencent workbench panel so
 * it can never cover the app or intercept pointer events. Idempotent per document
 * and safe to call after every navigation (a full page load drops the style, so
 * callers re-apply it post-`goto`). Never throws.
 */
export async function dismissTencentWorkbenchIfPresent(page: Page): Promise<void> {
    await page
        .evaluate(
            ({ styleId, css }) => {
                if (document.getElementById(styleId)) {
                    return;
                }

                const style = document.createElement("style");
                style.id = styleId;
                style.textContent = css;
                document.head.appendChild(style);
            },
            { styleId: NEUTRALIZE_STYLE_ID, css: NEUTRALIZE_CSS },
        )
        .catch(() => undefined);
}
