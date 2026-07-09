import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import News from "@/pages/News";

// Heavy chrome components - stub out
vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <footer data-testid="footer" /> }));
vi.mock("@/components/SEO", () => ({ SEO: ({ canonical }: any) => <meta data-testid="seo-canonical" data-canonical={canonical} /> }));

// useQuery is the only react-query hook News uses - stub it deterministically
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({ data: { rows: [], count: 0 }, isLoading: false }),
    keepPreviousData: undefined,
  };
});

// Supabase chain - unused since useQuery is mocked, but the import is resolved
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({}) }) }) },
}));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="probe" data-path={loc.pathname} data-search={loc.search} />;
}

describe("News page tag redirect", () => {
  it("redirects legacy ?tag=foo to /news/tag/foo (one-time, SEO-friendly)", async () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/news?tag=cbse-result"]}>
        <Routes>
          <Route path="/news" element={<><News /><LocationProbe /></>} />
          <Route path="/news/tag/:tag" element={<><News /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByTestId("probe").getAttribute("data-path")).toBe("/news/tag/cbse-result");
    });
    // The legacy ?tag= query should be cleared after redirect
    expect(getByTestId("probe").getAttribute("data-search")).toBe("");
    // Canonical points to the new SEO path
    expect(getByTestId("seo-canonical").getAttribute("data-canonical")).toBe("/news/tag/cbse-result");
  });

  it("renders /news/tag/:tag directly without further navigation", async () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/news/tag/admissions-2026"]}>
        <Routes>
          <Route path="/news" element={<><News /><LocationProbe /></>} />
          <Route path="/news/tag/:tag" element={<><News /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByTestId("probe").getAttribute("data-path")).toBe("/news/tag/admissions-2026");
    });
    expect(getByTestId("seo-canonical").getAttribute("data-canonical")).toBe("/news/tag/admissions-2026");
  });
});
