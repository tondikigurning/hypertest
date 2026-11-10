/**
 * Spike test (M1 Task 6): Confirm that scenario metadata is attached to task.meta
 * and is accessible via testCase.meta() in a custom reporter.
 *
 * This file contains 3 scenario-wrapped tests proving the metadata delivery path works.
 */
import { describe, expect } from "vitest";
import { scenario } from "./vitest/scenario";

describe("scenario() metadata spike", () => {
    scenario(
        {
            id: "TU_SPK_UT_001",
            title: "Metadata is attached to task.meta.scenario",
            type: "positive",
            category: "Spike",
            method: "unit",
            tags: ["smoke"],
        },
        async (ctx) => {
            // Verify the metadata object is accessible on the task
            const meta = (ctx.task.meta as unknown as Record<string, unknown>).scenario as Record<string, unknown>;
            expect(meta).toBeDefined();
            expect(meta.id).toBe("TU_SPK_UT_001");
            expect(meta.runner).toBe("vitest");
        },
    );

    scenario(
        {
            id: "TU_SPK_UT_002",
            title: "All metadata fields are correctly stored",
            type: "positive",
            category: "Spike",
            method: "unit",
            tags: ["smoke", "regression"],
            refs: ["HC-123"],
        },
        async (ctx) => {
            const meta = (ctx.task.meta as unknown as Record<string, unknown>).scenario as Record<string, unknown>;
            expect(meta.id).toBe("TU_SPK_UT_002");
            expect(meta.title).toBe("All metadata fields are correctly stored");
            expect(meta.type).toBe("positive");
            expect(meta.category).toBe("Spike");
            expect(meta.method).toBe("unit");
            expect(meta.tags).toEqual(["smoke", "regression"]);
            expect(meta.refs).toEqual(["HC-123"]);
            expect(meta.runner).toBe("vitest");
        },
    );

    scenario(
        {
            id: "TU_SPK_UT_003",
            title: "Metadata survives even when test body has assertions",
            type: "edge-case",
            category: "Spike",
            method: "unit",
        },
        async (ctx) => {
            // Perform some regular test work
            const value = 2 + 2;
            expect(value).toBe(4);

            // Metadata is still accessible
            const meta = (ctx.task.meta as unknown as Record<string, unknown>).scenario as Record<string, unknown>;
            expect(meta).toBeDefined();
            expect(meta.id).toBe("TU_SPK_UT_003");
            expect(meta.type).toBe("edge-case");
        },
    );
});
