import { renameSync, rmSync, writeFileSync } from "node:fs";
import type { BrowserContext, CDPSession, Page } from "@playwright/test";

/** Opt-in local preview; the ordinary BDD runner does not create a stream. */
export async function startLivePreview(context: BrowserContext): Promise<() => Promise<void>> {
    const framePath = process.env.AUTOMATION_LIVE_FRAME;
    if (!framePath) return async () => {};
    const sessions = new Set<CDPSession>();
    let closed = false;
    let lastFrame = 0;
    const attach = async (page: Page) => {
        try {
            const session = await context.newCDPSession(page);
            if (closed) { await session.detach(); return; }
            sessions.add(session);
            session.on("Page.screencastFrame", ({ data, sessionId }) => {
                void session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
                if (closed || Date.now() - lastFrame < 300) return;
                lastFrame = Date.now();
                try {
                    const temporary = `${framePath}.${process.pid}.tmp`;
                    writeFileSync(temporary, Buffer.from(data, "base64"));
                    renameSync(temporary, framePath);
                } catch { /* A preview failure must not affect test execution. */ }
            });
            await session.send("Page.startScreencast", { format: "jpeg", quality: 55, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
        } catch { /* Chromium or the page may have already closed. */ }
    };
    context.on("page", attach);
    await Promise.all(context.pages().map(attach));
    return async () => {
        closed = true;
        context.off("page", attach);
        await Promise.all([...sessions].map(session => session.detach().catch(() => {})));
        try { rmSync(framePath, { force: true }); } catch { /* Best effort. */ }
    };
}
