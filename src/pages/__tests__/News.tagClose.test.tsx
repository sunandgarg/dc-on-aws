import { describe, it, expect, vi } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import News from "@/pages/News";

vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <footer /> }));
vi.mock("@/components/SEO", () => ({
  SEO: ({ canonical, title }: any) => (
    <meta data-testid="seo" data-canonical={canonical} data-title={title} />
  ),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => ({ data: { rows: [], count: 0 }, isLoading: false }),
    keepPreviousData: undefined,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({}) }) }) },
}));

function Probe() {
  const loc = useLocation();
  return (
    <div
      data-testid="probe"
      data-path={loc.pathname}
      data-search={loc.search}
    />
  );
}

describe("News tag chip close button", () => {
  it("redirects to /news with no leftover tag query when close is clicked", async () => {
    const { getByTestId, getByRole } = render(
      <MemoryRouter initialEntries={["/news/tag/cbse-result?foo=bar"]}>
        <Routes>
          <Route path="/news" element={<><News /><Probe /></>} />
          <Route path="/news/tag/:tag" element={<><News /><Probe /></>} />
        </Routes>
      </MemoryRouter>
    );

    // Tag chip should be present
    const chip = await waitFor(() => getByRole("button", { name: /Tag:/i }));
    fireEvent.click(chip);

    await waitFor(() => {
      expect(getByTestId("probe").getAttribute("data-path")).toBe("/news");
    });
    // No tag query parameter survives
    const search = getByTestId("probe").getAttribute("data-search") || "";
    expect(search).not.toMatch(/tag=/);

    // Canonical + title reflect base /news page (no tag)
    const seo = getByTestId("seo");
    expect(seo.getAttribute("data-canonical")).toBe("/news");
    expect(seo.getAttribute("data-title")).toMatch(/Education News/i);
  });
});
