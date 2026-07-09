import { describe, it, expect } from "vitest";
import { can, canAccessModule, highestRole, AppRole } from "@/lib/rbac";

describe("RBAC capability matrix", () => {
  it("admin can do everything", () => {
    const roles: AppRole[] = ["admin"];
    expect(can(roles, "articles", "delete")).toBe(true);
    expect(can(roles, "leads", "edit")).toBe(true);
    expect(can(roles, "integrations", "create")).toBe(true);
  });

  it("manager cannot delete but can edit content", () => {
    const roles: AppRole[] = ["manager"];
    expect(can(roles, "articles", "edit")).toBe(true);
    expect(can(roles, "articles", "delete")).toBe(false);
    expect(can(roles, "leads", "view")).toBe(true);
    expect(can(roles, "leads", "edit")).toBe(false);
  });

  it("editor has scoped access", () => {
    const roles: AppRole[] = ["editor"];
    expect(can(roles, "articles", "edit")).toBe(true);
    expect(can(roles, "articles", "delete")).toBe(false);
    expect(can(roles, "colleges", "create")).toBe(true);
    expect(can(roles, "colleges", "edit")).toBe(false);
    expect(can(roles, "leads", "view")).toBe(false);
  });

  it("contributor only edits own articles", () => {
    const roles: AppRole[] = ["contributor"];
    expect(can(roles, "articles", "create")).toBe(true);
    expect(can(roles, "articles", "edit_own")).toBe(true);
    expect(can(roles, "articles", "edit")).toBe(false);
    expect(can(roles, "articles", "delete")).toBe(false);
    expect(can(roles, "colleges", "view")).toBe(false);
  });

  it("plain user has no admin module access", () => {
    expect(canAccessModule(["user"], "articles")).toBe(false);
    expect(canAccessModule(["user"], "leads")).toBe(false);
  });

  it("highestRole picks correct precedence", () => {
    expect(highestRole(["user", "editor", "admin"])).toBe("admin");
    expect(highestRole(["contributor", "editor"])).toBe("editor");
    expect(highestRole([])).toBe("user");
  });

  it("multi-role union: contributor + manager gets manager edit on articles", () => {
    expect(can(["contributor", "manager"], "articles", "edit")).toBe(true);
  });
});
