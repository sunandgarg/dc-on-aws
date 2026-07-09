import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ensureBootstrap } from '@/lib/bootstrap';

interface FeatureToggle {
  feature_key: string;
  label: string;
  parent_key: string | null;
  is_enabled: boolean;
}

export function useFeatureToggles() {
  const { data: toggles = [], isLoading } = useQuery({
    queryKey: ['feature-toggles'],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot?.feature_toggles) return boot.feature_toggles as FeatureToggle[];
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('feature_key, label, parent_key, is_enabled');
      if (error) throw error;
      return data as FeatureToggle[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (toggles.length === 0) return true; // Default to enabled if not loaded
    
    const toggle = toggles.find(t => t.feature_key === featureKey);
    if (!toggle) return true; // Not in DB = enabled by default
    
    // If it has a parent, parent must also be enabled
    if (toggle.parent_key) {
      const parent = toggles.find(t => t.feature_key === toggle.parent_key);
      if (parent && !parent.is_enabled) return false;
    }
    
    return toggle.is_enabled;
  };

  return { toggles, isLoading, isFeatureEnabled };
}
