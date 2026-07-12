import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CAT_UNIVERSE_DEFAULT_CUTOFFS,
  CAT_UNIVERSE_DEFAULT_MODULES,
  CAT_UNIVERSE_DEFAULT_RESOURCES,
  CAT_UNIVERSE_DEFAULT_SECTIONS,
  CAT_UNIVERSE_DEFAULT_SETTINGS,
  type CatUniverseCutoff,
  type CatUniverseModule,
  type CatUniverseResource,
  type CatUniverseSection,
  type CatUniverseSettings,
} from "@/lib/catUniverse";

type CatUniversePayload = {
  settings: CatUniverseSettings;
  sections: CatUniverseSection[];
  modules: CatUniverseModule[];
  resources: CatUniverseResource[];
  cutoffs: CatUniverseCutoff[];
};

async function loadCatUniverse(): Promise<CatUniversePayload> {
  const results = await Promise.allSettled([
    (supabase as any).from("cat_universe_settings").select("*").eq("slug", "default").maybeSingle(),
    (supabase as any).from("cat_universe_sections").select("*").order("display_order", { ascending: true }),
    (supabase as any).from("cat_universe_modules").select("*").order("display_order", { ascending: true }),
    (supabase as any).from("cat_universe_resources").select("*").order("display_order", { ascending: true }),
    (supabase as any).from("cat_universe_cutoffs").select("*").order("display_order", { ascending: true }),
  ]);

  const settingsResult = results[0].status === "fulfilled" ? results[0].value : null;
  const sectionsResult = results[1].status === "fulfilled" ? results[1].value : null;
  const modulesResult = results[2].status === "fulfilled" ? results[2].value : null;
  const resourcesResult = results[3].status === "fulfilled" ? results[3].value : null;
  const cutoffsResult = results[4].status === "fulfilled" ? results[4].value : null;

  return {
    settings: settingsResult?.data || CAT_UNIVERSE_DEFAULT_SETTINGS,
    sections: sectionsResult?.data?.length ? sectionsResult.data : CAT_UNIVERSE_DEFAULT_SECTIONS,
    modules: modulesResult?.data?.length ? modulesResult.data : CAT_UNIVERSE_DEFAULT_MODULES,
    resources: resourcesResult?.data?.length ? resourcesResult.data : CAT_UNIVERSE_DEFAULT_RESOURCES,
    cutoffs: cutoffsResult?.data?.length ? cutoffsResult.data : CAT_UNIVERSE_DEFAULT_CUTOFFS,
  };
}

export function useCatUniverseData() {
  return useQuery({
    queryKey: ["cat-universe"],
    queryFn: loadCatUniverse,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCatUniverseModule(slug?: string) {
  const query = useCatUniverseData();

  const payload = useMemo(() => {
    const data = query.data;
    if (!data || !slug) return null;

    const module = data.modules.find((item) => item.slug === slug && item.is_active);
    if (!module) return null;

    const section = data.sections.find((item) => item.slug === module.section_slug);
    const resources = data.resources.filter((item) => item.module_slug === module.slug && item.is_active);
    const cutoffs = data.cutoffs.filter((item) => item.module_slug === module.slug && item.is_active);
    const siblingModules = data.modules.filter(
      (item) => item.section_slug === module.section_slug && item.slug !== module.slug && item.is_active,
    );

    return { ...data, module, section, resources, cutoffs, siblingModules };
  }, [query.data, slug]);

  return { ...query, payload };
}
