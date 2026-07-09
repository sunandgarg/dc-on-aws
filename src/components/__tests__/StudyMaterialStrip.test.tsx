import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudyMaterialStrip } from "@/components/StudyMaterialStrip";

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("StudyMaterialStrip", () => {
  it("renders all 5 class tiles (8-12) with bold large text on mobile", () => {
    render(wrap(<StudyMaterialStrip />));
    [8, 9, 10, 11, 12].forEach((c) => {
      expect(screen.getByText(String(c))).toBeInTheDocument();
    });
  });

  it("each class tile uses extrabold large font for mobile legibility", () => {
    render(wrap(<StudyMaterialStrip />));
    const eight = screen.getByText("8");
    expect(eight.className).toMatch(/font-extrabold/);
    expect(eight.className).toMatch(/text-(2xl|3xl|4xl)/);
  });

  it("links to /study-material/class-N", () => {
    render(wrap(<StudyMaterialStrip />));
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    [8, 9, 10, 11, 12].forEach((c) =>
      expect(hrefs).toContain(`/study-material/class-${c}`)
    );
  });
});
