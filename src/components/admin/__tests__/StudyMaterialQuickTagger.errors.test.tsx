import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { StudyMaterialQuickTagger } from "../StudyMaterialQuickTagger";

// Configurable behavior per test
const cfg: {
  preloadError: string | null;
  insertError: string | null;
  insertDelay: number;
  store: Record<string, { entity_type: string; entity_slug: string }[]>;
} = { preloadError: null, insertError: null, insertDelay: 0, store: {} };

vi.mock("@/integrations/supabase/client", () => {
  function tableApi(table: string) {
    const _filters: any = {};
    let _inFilter: { col: string; vals: any[] } | null = null;
    const api: any = {
      select: () => api,
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
          if (cfg.preloadError) {
            resolve({ data: null, error: { message: cfg.preloadError } });
            return;
          }
          const aid = _filters.article_id;
          let rows = cfg.store[aid] || [];
          if (_inFilter) rows = rows.filter((r: any) => _inFilter!.vals.includes(r[_inFilter!.col]));
          resolve({ data: rows, error: null });
        } else if (table === "study_boards") {
          resolve({ data: [{ slug: "cbse", name: "CBSE" }], error: null });
        } else if (table === "study_subjects") {
          // Return a subject for any class/board so chips render
          resolve({ data: [{ id: "sub-1", slug: "math", name: "Mathematics" }], error: null });
        } else if (table === "study_chapters") {
          resolve({ data: [], error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return api;
  }
  return {
    supabase: {
      from: (table: string) => {
        const api = tableApi(table);
        return {
          ...api,
          insert: async (rows: any | any[]) => {
            if (cfg.insertDelay) await new Promise(r => setTimeout(r, cfg.insertDelay));
            if (cfg.insertError) return { error: { message: cfg.insertError } };
            const list = Array.isArray(rows) ? rows : [rows];
            list.forEach((r: any) => {
              cfg.store[r.article_id] = cfg.store[r.article_id] || [];
              cfg.store[r.article_id].push({ entity_type: r.entity_type, entity_slug: r.entity_slug });
            });
            return { error: null };
          },
        };
      },
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("StudyMaterialQuickTagger error + persistence flows", () => {
  beforeEach(() => {
    cfg.preloadError = null;
    cfg.insertError = null;
    cfg.insertDelay = 0;
    for (const k in cfg.store) delete cfg.store[k];
  });

  it("shows inline error banner when preload fails", async () => {
    cfg.preloadError = "network down";
    render(
      <StudyMaterialQuickTagger
        tags={["study-material"]}
        onChange={() => {}}
        articleId="article-err"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Could not preload saved links/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it("shows inline error banner and re-enables Apply when save fails", async () => {
    cfg.insertError = "insert blew up";
    render(
      <StudyMaterialQuickTagger
        tags={["study-material"]}
        onChange={() => {}}
        articleId="article-fail"
      />
    );
    // Wait for preload to finish + subject chip to render
    await waitFor(() => expect(screen.getByText(/Mathematics/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Mathematics/i));
    fireEvent.click(screen.getByRole("button", { name: /Apply tags \(1 selected\)/i }));
    await waitFor(() => {
      expect(screen.getByText(/Could not save study links/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/insert blew up/i)).toBeInTheDocument();
    // Apply button is re-enabled after failure
    expect(screen.getByRole("button", { name: /Apply tags/i })).not.toBeDisabled();
  });

  it("disables Apply while a save is in flight", async () => {
    cfg.insertDelay = 60;
    render(
      <StudyMaterialQuickTagger
        tags={["study-material"]}
        onChange={() => {}}
        articleId="article-busy"
      />
    );
    await waitFor(() => expect(screen.getByText(/Mathematics/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Mathematics/i));
    const btn = screen.getByRole("button", { name: /Apply tags \(1 selected\)/i });
    fireEvent.click(btn);
    // While in flight: button shows Saving… and is disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
    });
    // Eventually settles back
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Apply tags/i })).not.toBeDisabled();
    });
  });

  it("keeps subject/chapter selections after switching class/board", async () => {
    const ARTICLE = "article-switch";
    cfg.store[ARTICLE] = [
      { entity_type: "study_subject", entity_slug: "sub-1" },
      { entity_type: "study_chapter", entity_slug: "chap-99" },
    ];
    render(
      <StudyMaterialQuickTagger
        tags={["study-material"]}
        onChange={() => {}}
        articleId={ARTICLE}
      />
    );
    // After preload, 2 items selected
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Apply tags \(2 selected\)/i })).toBeInTheDocument();
    });
    // Switch class chip
    fireEvent.click(screen.getByRole("button", { name: /Class 9/i }));
    // Selections persist
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Apply tags \(2 selected\)/i })).toBeInTheDocument();
    });
    // Switch board chip (CBSE is the only one but click is still a no-op state change)
    fireEvent.click(screen.getByRole("button", { name: /^CBSE$/i }));
    expect(screen.getByRole("button", { name: /Apply tags \(2 selected\)/i })).toBeInTheDocument();
  });
});
