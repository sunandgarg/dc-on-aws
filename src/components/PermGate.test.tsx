import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PermGate } from "@/components/PermGate";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAdmin: false,
    user: { id: "user-1" },
    can: (m: string, a: string) => m === "articles" && (a === "create" || a === "edit_own"),
  }),
}));

describe("PermGate", () => {
  it("renders when permission allowed", () => {
    render(<PermGate module="articles" action="create"><span>OK</span></PermGate>);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("hides when not allowed", () => {
    render(<PermGate module="articles" action="delete"><span>NO</span></PermGate>);
    expect(screen.queryByText("NO")).not.toBeInTheDocument();
  });

  it("edit_own respects ownership", () => {
    render(<PermGate module="articles" action="edit_own" ownerId="user-1"><span>MINE</span></PermGate>);
    expect(screen.getByText("MINE")).toBeInTheDocument();
  });

  it("edit_own denies for other owner", () => {
    render(<PermGate module="articles" action="edit_own" ownerId="user-2"><span>OTHER</span></PermGate>);
    expect(screen.queryByText("OTHER")).not.toBeInTheDocument();
  });
});
