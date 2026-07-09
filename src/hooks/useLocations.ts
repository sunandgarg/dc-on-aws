import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { indianStates, citiesByState, priorityStates } from "@/data/indianLocations";

// Keep priority states (Delhi NCR, Haryana, UP, ...) at the top, the rest alphabetical.
function orderStates(all: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const s of priorityStates) if (all.includes(s) && !seen.has(s)) { ordered.push(s); seen.add(s); }
  const rest = all.filter((s) => !seen.has(s) && s !== "Delhi").sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

interface StateCity {
  state: string;
  city: string;
}

/**
 * Returns all Indian states + cities. Uses DB `states_cities` if populated,
 * otherwise falls back to the bundled full India dataset so filters always
 * show every state/city.
 */
export function useStatesAndCities() {
  return useQuery({
    queryKey: ["states-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("states_cities")
        .select("state, city")
        .eq("is_active", true)
        .order("state")
        .order("city");
      if (error) throw error;

      const fallback = { states: orderStates(indianStates), citiesByState };
      if (!data || data.length === 0) return fallback;

      const statesSet = new Set<string>(indianStates);
      const citiesMap: Record<string, string[]> = { ...citiesByState };

      (data as StateCity[]).forEach(({ state, city }) => {
        // Coerce legacy "Delhi" rows into "Delhi NCR" for filter UX
        const s = state === "Delhi" ? "Delhi NCR" : state;
        statesSet.add(s);
        if (!citiesMap[s]) citiesMap[s] = [];
        if (!citiesMap[s].includes(city)) citiesMap[s].push(city);
      });
      statesSet.delete("Delhi");

      return {
        states: orderStates(Array.from(statesSet)),
        citiesByState: citiesMap,
      };
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: { states: orderStates(indianStates), citiesByState },
  });
}
