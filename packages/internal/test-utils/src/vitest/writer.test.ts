import { describe, expect, it } from "vitest";
import { componentNameFromFile, packageSlugFromName } from "./writer";

describe("packageSlugFromName", () => {
  it("strips a pkg: prefix", () => {
    expect(packageSlugFromName("pkg:ui")).toBe("ui");
  });

  it("strips an app: prefix", () => {
    expect(packageSlugFromName("app:tenants")).toBe("tenants");
  });

  it("strips any other single-word colon prefix", () => {
    expect(packageSlugFromName("crm:shared")).toBe("shared");
  });

  it("leaves a name with no colon prefix unchanged", () => {
    expect(packageSlugFromName("ui")).toBe("ui");
  });
});

describe("componentNameFromFile", () => {
  it("derives a kebab-case component name from a .test.tsx path", () => {
    expect(componentNameFromFile("apps/tenants/tests/unit-test/features/users/users-create-payload.test.tsx")).toBe(
      "users-create-payload",
    );
  });
});
