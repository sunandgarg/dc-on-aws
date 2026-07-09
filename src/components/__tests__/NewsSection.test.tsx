import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useArticlesData", () => ({
  useDbArticles: () => ({
    data: [
      { id: "1", slug: "a-1", title: "Article One", description: "d1", category: "Admissions", tags: ["trending"], featured_image: "", created_at: new Date().toISOString() },
      { id: "2", slug: "a-2", title: "Article Two", description: "d2", category: "Results", tags: [], featured_image: "", created_at: new Date().toISOString() },
      { id: "3", slug: "a-3", title: "Article Three", description: "d3", category: "Scholarships", tags: [], featured_image: "", created_at: new Date().toISOString() },
    ],
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ data: [], error: null }) }),
      }),
    }),
  },
}));

vi.mock("@/components/LeadCaptureForm", () => ({ LeadCaptureForm: () => null }));
vi.mock("@/components/DynamicAdBanner", () => ({ DynamicAdBanner: () => null }));

import { NewsSection } from "@/components/NewsSection";

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("NewsSection (homepage)", () => {
  it("renders both 'View All' link and bottom button pointing to /articles", () => {
    render(wrap(<NewsSection />));
    const links = screen.getAllByRole("link");
    const articleLinks = links.filter((l) => l.getAttribute("href") === "/articles");
    // Desktop link + mobile link + bottom CTA button
    expect(articleLinks.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/View All News & Updates/i)).toBeInTheDocument();
  });

  it("renders seeded sample articles", () => {
    render(wrap(<NewsSection />));
    expect(screen.getByText("Article One")).toBeInTheDocument();
  });
});
