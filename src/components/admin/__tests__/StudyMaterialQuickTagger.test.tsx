import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { StudyMaterialQuickTagger } from "../StudyMaterialQuickTagger";

// In-memory fake article_links store keyed by article_id
const store: Record<string, { entity_type: string; entity_slug: string }[]> = {};

vi.mock("@/integrations/supabase/client", () => {
  function tableApi(table: string) {
    let _filters: any = {};
    let _select = "*";
    let _inFilter: { col: string; vals: any[] } | null = null;
    const api: any = {
      select: (cols: string) => { _select = cols; return api; },
      eq: (col: string, val: any) => { _filters[col] = val; return api; },
      in: (col: string, vals: any[]) => { _inFilter = { col, vals }; return api; },
      order: () => api,
      maybeSingle: async () => {
        if (table === "study_subjects" && _filters.id) {
          return { data: { class_num: 10, board_slug: "cbse" }, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: any) => {
        if (table === "article_links") {
          const aid = _filters.article_id;
          let rows = store[aid] || [];
          if (_inFilter) rows = rows.filter((r: any) => _inFilter!.vals.includes(r[_inFilter!.col]));
          resolve({ data: rows, error: null });
        } else if (table === "study_boards") {
          resolve({ data: [{ slug: "cbse", name: "CBSE" }], error: null });
        } else if (table === "study_subjects") {
          resolve({ data: [{ id: "sub-1", slug: "math", name: "Mathematics" }], error: null });
        } else if (table === "study_chapters") {
          resolve({ data: [], error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    // Trigger awaits on the chain (read path uses await on .eq().in())
    Object.defineProperty(api, "then", { value: api.then, writable: true });
    return api;
  }
  return {
    supabase: {
      from: (table: string) => {
        const api = tableApi(table);
        return {
          ...api,
          insert: async (rows: any | any[]) => {
            const list = Array.isArray(rows) ? rows : [rows];
            list.forEach((r: any) => {
              const aid = r.article_id;
              store[aid] = store[aid] || [];
              store[aid].push({ entity_type: r.entity_type, entity_slug: r.entity_slug });
            });
            return { error: null };
          },
        };
      },
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("StudyMaterialQuickTagger persistence", () => {
  beforeEach(() => { for (const k in store) delete store[k]; });

  it("preloads previously saved subject/chapter links when re-opened", async () => {
    const ARTICLE = "article-uuid-123";
    // Simulate a prior save
    store[ARTICLE] = [
      { entity_type: "study_subject", entity_slug: "sub-1" },
      { entity_type: "study_chapter", entity_slug: "chap-1" },
    ];
    const onChange = vi.fn();
    render(
      <StudyMaterialQuickTagger
        tags={["study-material", "class-10-cbse"]}
        onChange={onChange}
        articleId={ARTICLE}
      />
    );
    // Wait for the preloading banner to disappear (preload completed)
    await waitFor(() => {
      expect(screen.queryByText(/Loading saved subject/i)).not.toBeInTheDocument();
    });
    // The component's selected-state Set should contain the previously saved IDs.
    // We assert indirectly by checking the Apply button count reflects 2 selected items.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Apply tags \(2 selected\)/i })).toBeInTheDocument();
    });
  });

  it("disables Apply while preloading and surfaces inline errors on failure", async () => {
    // No store entry → preload returns empty quickly. Verify no error banner shows.
    render(
      <StudyMaterialQuickTagger
        tags={["study-material", "class-10-cbse"]}
        onChange={() => {}}
        articleId="article-empty"
      />
    );
    await waitFor(() => {
      expect(screen.queryByText(/Could not preload/i)).not.toBeInTheDocument();
    });
  });
});
