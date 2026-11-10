import { describe, expect, it } from "vitest";
import { validateMeta } from "./validate";

describe("validateMeta", () => {
    it("accepts valid metadata", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_001",
                title: "A valid test",
                expect: "The scenario should pass with valid input",
                type: "positive",
                category: "Pipeline Tabs",
                method: "unit",
            }),
        ).not.toThrow();
    });

    it("accepts metadata with optional fields", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_002",
                title: "With optional fields",
                expect: "The scenario should include optional tags and refs",
                type: "negative",
                category: "Pipeline Tabs",
                method: "unit",
                tags: ["smoke", "regression"],
                refs: ["HC-123"],
            }),
        ).not.toThrow();
    });

    it("rejects null input", () => {
        expect(() => validateMeta(null)).toThrow("requires a metadata object");
    });

    it("rejects invalid id pattern", () => {
        expect(() =>
            validateMeta({
                id: "bad-id",
                title: "Test",
                expect: "Invalid ids should be rejected",
                type: "positive",
                category: "Cat",
                method: "unit",
            }),
        ).toThrow("does not match the required pattern");
    });

    it("rejects invalid type", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_001",
                title: "Test",
                expect: "Invalid type should be rejected",
                type: "invalid",
                category: "Cat",
                method: "unit",
            }),
        ).toThrow("`type` must be one of");
    });

    it("rejects invalid method", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_001",
                title: "Test",
                expect: "Invalid method should be rejected",
                type: "positive",
                category: "Cat",
                method: "invalid",
            }),
        ).toThrow("`method` must be one of");
    });

    it("requires reason for manual method", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_MAN_001",
                title: "Manual test",
                expect: "Reason is required for manual scenarios",
                type: "ui-interaction",
                category: "Cat",
                method: "manual",
            }),
        ).toThrow('`reason` is required when method is "manual"');
    });

    it("accepts valid manual scenario with reason", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_MAN_001",
                title: "Manual test",
                expect: "Manual scenario metadata should validate",
                type: "ui-interaction",
                category: "Cat",
                method: "manual",
                reason: "Animation quality cannot be automated reliably.",
            }),
        ).not.toThrow();
    });

    it("rejects non-array tags", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_001",
                title: "Test",
                expect: "Non-array tags should be rejected",
                type: "positive",
                category: "Cat",
                method: "unit",
                tags: "smoke",
            }),
        ).toThrow("`tags` must be an array of strings");
    });

    it("does not require expect for unit metadata", () => {
        expect(() =>
            validateMeta({
                id: "DV_PIP_UT_010",
                title: "Missing expect",
                type: "positive",
                category: "Cat",
                method: "unit",
            }),
        ).not.toThrow();
    });

    it("requires expect for e2e metadata", () => {
        expect(() =>
            validateMeta({
                id: "TEN_AUTH_E2E_010",
                title: "Missing expect",
                type: "positive",
                category: "Cat",
                method: "e2e",
                scenario: "Given X\nWhen Y\nThen Z",
            }),
        ).toThrow("`expect` is required when method is \"e2e\"");
    });

    it("requires scenario for e2e metadata", () => {
        expect(() =>
            validateMeta({
                id: "TEN_AUTH_E2E_001",
                title: "Successful login with valid credentials",
                expect: "user should be redirected to dashboard",
                type: "positive",
                category: "User Authentication",
                method: "e2e",
            }),
        ).toThrow("`scenario` is required when method is \"e2e\"");
    });

    it("accepts e2e metadata with scenario", () => {
        expect(() =>
            validateMeta({
                id: "TEN_AUTH_E2E_001",
                title: "Successful login with valid credentials",
                expect: "they are redirected to the dashboard",
                type: "positive",
                category: "User Authentication",
                method: "e2e",
                scenario:
                    "Given the user is on the login page\nWhen they enter valid credentials\nThen they are redirected to the dashboard",
            }),
        ).not.toThrow();
    });

    it("collects multiple errors in one throw", () => {
        expect(() => validateMeta({ id: "", title: "", type: "bad", method: "bad" })).toThrow(
            /id.*title.*type.*category.*method/s,
        );
    });
});
