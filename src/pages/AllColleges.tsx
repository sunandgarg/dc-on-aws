import { useState, useMemo, Fragment, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { FloatingBot } from "@/components/FloatingBot";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { CollegeCard } from "@/components/CollegeCard";
import { CollegeCardSkeleton } from "@/components/SkeletonCards";
import { InlineAdSlot } from "@/components/InlineAdSlot";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { MobileBottomFilter } from "@/components/MobileBottomFilter";
import { FilterAccordionGroup } from "@/components/FilterAccordion";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { getCollegeHeading, collegeSeoRoutes } from "@/lib/seoSlugs";
import { useSEO } from "@/hooks/useSEO";
import { parseCollegeSlug, filtersToSlug } from "@/lib/seoSlugRoutes";
import { useCanonical } from "@/hooks/useCanonical";
import {
  getCourseGroupSearchTerms,
  normalizeCollegeCourseGroup,
  readMultiParam,
  resolveFacetCategories,
  uniqueValues,
  writeMultiParam,
} from "@/lib/listingFilters";
import {
  collegeStreams, collegeTypes,
  collegeFeeRanges, collegeCourseGroups, collegeExams,
} from "@/data/indianLocations";
import { useStatesAndCities } from "@/hooks/useLocations";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

const collegeApprovals = ["AICTE", "UGC", "NAAC", "MCI", "BCI", "AACSB"] as const;
const collegeNaacGrades = ["A++", "A+", "A", "B++", "B+"] as const;

/**
 * AllColleges - College listing page with:
 * - SEO-optimized dynamic headings based on active filters
 * - Infinite scroll with cursor-based pagination (12 items per batch)
 * - Sidebar filters with search, checkboxes, and mobile sheet
 * - Inline ads every 6 cards
 * - Featured college priority ordering
 */
export default function AllColleges() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Parse SEO slug from URL like /colleges/top-btech-colleges-in-delhi
  const seoSlugFilters = useMemo(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[2]?.startsWith("top-")) {
      return parseCollegeSlug(pathParts.slice(2).join("-"));
    }
    return {};
  }, [location.pathname]);

  const [selectedStreams, setSelectedStreams] = useState<string[]>(() => {
    return readMultiParam(searchParams, "stream", seoSlugFilters.stream ? [seoSlugFilters.stream] : []);
  });
  const [selectedState, setSelectedState] = useState(() => searchParams.get("state") || seoSlugFilters.state || "");
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get("city") || seoSlugFilters.city || "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => seoSlugFilters.type ? [seoSlugFilters.type] : []);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [selectedNaac, setSelectedNaac] = useState<string[]>([]);
  const [selectedCourseGroups, setSelectedCourseGroups] = useState<string[]>(() => {
    return readMultiParam(searchParams, "group", seoSlugFilters.group ? [normalizeCollegeCourseGroup(seoSlugFilters.group)] : []).map(normalizeCollegeCourseGroup);
  });
  const [selectedFeeRanges, setSelectedFeeRanges] = useState<string[]>([]);
  const [selectedExams, setSelectedExams] = useState<string[]>(() => {
    return readMultiParam(searchParams, "exam");
  });

  // Hydrate filters from URL/SEO slug whenever the URL changes
  // (so "MSc in Mumbai" → "BSc in Bangalore" navigation reapplies filters)
  useEffect(() => {
    const stream = readMultiParam(searchParams, "stream", seoSlugFilters.stream ? [seoSlugFilters.stream] : []);
    const group = readMultiParam(searchParams, "group", seoSlugFilters.group ? [normalizeCollegeCourseGroup(seoSlugFilters.group)] : []).map(normalizeCollegeCourseGroup);
    const st = searchParams.get("state") || seoSlugFilters.state || "";
    const ci = searchParams.get("city") || seoSlugFilters.city || "";
    const ty = seoSlugFilters.type;
    const ex = readMultiParam(searchParams, "exam");
    setSelectedStreams(stream);
    setSelectedCourseGroups(group);
    setSelectedState(st);
    setSelectedCity(ci);
    setSelectedTypes(ty ? [ty] : []);
    setSelectedExams(ex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);
  const { data: locations } = useStatesAndCities();

  useCanonical();

  // Build filters for DB query
  const dbFilters = useMemo(() => {
    const f: Record<string, string | string[] | undefined> = {};
    const categories = resolveFacetCategories(selectedStreams, selectedCourseGroups);
    if (categories.length > 0) f.category = categories.length === 1 ? categories[0] : categories;
    if (selectedState) f.state = selectedState;
    if (selectedCity) f.city = selectedCity;
    if (selectedTypes.length > 0) f.type = selectedTypes.length === 1 ? selectedTypes[0] : selectedTypes;
    return f;
  }, [selectedStreams, selectedCourseGroups, selectedState, selectedCity, selectedTypes]);

  // When a course group is selected (e.g. "M.Sc"), boost matching by also
  // searching the college name/tags for that group. This keeps "MSc in Mumbai"
  // style links useful even though colleges have no native course-group column.
  const effectiveSearch = useMemo(() => {
    if (search) return search;
    return undefined;
  }, [search]);

  const courseGroupSearch = useMemo(() => getCourseGroupSearchTerms(selectedCourseGroups), [selectedCourseGroups]);

  const { items: colleges, sentinelRef, isLoading, isFetchingMore, hasMore } = useInfiniteData({
    table: "colleges",
    queryKey: ["infinite-colleges"],
    // Admin priority is the source of truth for frontend ranking: 1 = first,
    // 2 = second, default/null priorities stay below explicit ranks.
    orderBy: "priority",
    ascending: true,
    nullsFirst: false,
    extraOrders: [
      { column: "featured_rank", ascending: true, nullsFirst: false },
      { column: "priority_updated_at", ascending: false, nullsFirst: false },
      { column: "rating", ascending: false, nullsFirst: false },
      { column: "name", ascending: true },
    ],
    filters: dbFilters,
    search: effectiveSearch,
    searchGroups: courseGroupSearch.length > 0 ? [{ terms: courseGroupSearch, fields: ["name", "short_name", "category", "description"] }] : [],
    searchFields: ["name", "city", "short_name", "location", "category"],
  });

  // Update URL to SEO slug format
  useEffect(() => {
    const multiFilterCount = [selectedStreams, selectedCourseGroups, selectedTypes, selectedExams].filter((v) => v.length > 1).length;
    const useQueryUrl = multiFilterCount > 0 || (selectedStreams.length > 0 && selectedCourseGroups.length > 0);

    if (useQueryUrl) {
      const params = new URLSearchParams();
      writeMultiParam(params, "stream", selectedStreams);
      writeMultiParam(params, "group", selectedCourseGroups);
      writeMultiParam(params, "type", selectedTypes);
      writeMultiParam(params, "exam", selectedExams);
      if (selectedState) params.set("state", selectedState);
      if (selectedCity) params.set("city", selectedCity);
      const newPath = params.toString() ? `/colleges?${params.toString()}` : "/colleges";
      if (`${location.pathname}${location.search}` !== newPath) navigate(newPath, { replace: true });
      return;
    }

    const filters: Record<string, string> = {};
    if (selectedCourseGroups.length === 1) filters.group = selectedCourseGroups[0];
    else if (selectedStreams.length === 1) filters.stream = selectedStreams[0];
    if (selectedCity) filters.city = selectedCity;
    if (selectedState) filters.state = selectedState;
    if (selectedTypes.length === 1) filters.type = selectedTypes[0];
    if (selectedExams.length === 1) filters.exam = selectedExams[0];

    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) {
      const slug = filtersToSlug("colleges", filters);
      const newPath = `/colleges/${slug}`;
      if (`${location.pathname}${location.search}` !== newPath) {
        navigate(newPath, { replace: true });
      }
    } else if (`${location.pathname}${location.search}` !== "/colleges") {
      navigate("/colleges", { replace: true });
    }
  }, [selectedStreams, selectedCourseGroups, selectedState, selectedCity, selectedTypes, selectedExams, navigate, location.pathname, location.search]);

  const activeFilters = uniqueValues([
    ...selectedStreams, ...selectedTypes, ...selectedApprovals,
    ...selectedNaac, ...selectedCourseGroups, ...selectedFeeRanges,
    ...selectedExams,
    ...(selectedState ? [selectedState] : []),
    ...(selectedCity ? [selectedCity] : []),
  ]);

  const cities = selectedState ? (locations?.citiesByState[selectedState] || []) : [];

  // Client-side secondary filtering (for filters not in DB query)
  const filtered = useMemo(() => {
    let base = colleges.filter((c: any) => {
      const matchApproval = selectedApprovals.length === 0 || selectedApprovals.some(a => c.approvals?.includes(a));
      const matchNaac = selectedNaac.length === 0 || selectedNaac.includes(c.naac_grade);
      return matchApproval && matchNaac;
    });

    return base;
  }, [colleges, selectedApprovals, selectedNaac]);

  // SEO-optimized heading
  const heading = useMemo(() => getCollegeHeading({
    courseGroup: selectedCourseGroups[0],
    stream: selectedStreams[0],
    state: selectedState,
    city: selectedCity,
    type: selectedTypes[0],
    exam: selectedExams[0],
    approval: selectedApprovals[0],
  }), [selectedStreams, selectedCourseGroups, selectedState, selectedCity, selectedTypes, selectedExams, selectedApprovals]);

  useSEO({ title: heading, description: `Explore ${heading.toLowerCase()} - compare fees, placements, NAAC ratings and admissions.` });

  const clearAll = () => {
    setSelectedStreams([]); setSelectedState(""); setSelectedCity("");
    setSelectedTypes([]); setSelectedApprovals([]); setSelectedNaac([]);
    setSelectedCourseGroups([]); setSelectedFeeRanges([]); setSelectedExams([]);
  };

  const removeFilter = (f: string) => {
    setSelectedStreams(prev => prev.filter(x => x !== f));
    setSelectedTypes(prev => prev.filter(x => x !== f));
    setSelectedApprovals(prev => prev.filter(x => x !== f));
    setSelectedNaac(prev => prev.filter(x => x !== f));
    setSelectedCourseGroups(prev => prev.filter(x => x !== f));
    setSelectedFeeRanges(prev => prev.filter(x => x !== f));
    setSelectedExams(prev => prev.filter(x => x !== f));
    if (f === selectedState) { setSelectedState(""); setSelectedCity(""); }
    if (f === selectedCity) setSelectedCity("");
  };

  const filterConfigs = [
    { title: "Streams", items: collegeStreams, selected: selectedStreams, onChange: setSelectedStreams },
    { title: "Course Groups", items: collegeCourseGroups, selected: selectedCourseGroups, onChange: (v: string[]) => setSelectedCourseGroups(uniqueValues(v.map(normalizeCollegeCourseGroup))) },
    { title: "States", items: locations?.states || [], selected: selectedState ? [selectedState] : [], onChange: (v: string[]) => { setSelectedState(v[v.length - 1] || ""); setSelectedCity(""); }, singleSelect: true },
    ...(cities.length > 0 ? [{ title: "Cities", items: cities, selected: selectedCity ? [selectedCity] : [], onChange: (v: string[]) => setSelectedCity(v[v.length - 1] || ""), singleSelect: true }] : []),
    { title: "Exams", items: collegeExams, selected: selectedExams, onChange: setSelectedExams },
    { title: "Institute Type", items: collegeTypes, selected: selectedTypes, onChange: setSelectedTypes },
    { title: "Total Fees", items: collegeFeeRanges, selected: selectedFeeRanges, onChange: setSelectedFeeRanges },
    { title: "Approved By", items: collegeApprovals as unknown as string[], selected: selectedApprovals, onChange: setSelectedApprovals },
    { title: "NAAC Grade", items: collegeNaacGrades as unknown as string[], selected: selectedNaac, onChange: setSelectedNaac },
  ];

  const ITEMS_PER_AD = 6;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="colleges" />

      <main className="px-3 md:container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "Colleges" }]} />
        <header className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-primary mb-1">{heading}</h1>
          <p className="text-sm text-muted-foreground">Showing {filtered.length}+ top colleges - compare fees, placements, rankings & more</p>
        </header>

        <AlsoCheckSection variant="strip" className="mb-4" />

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search colleges by name or city..." className="pl-10 rounded-xl h-10" />
          </div>
        </div>

        {/* SEO Quick Links */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {collegeSeoRoutes.slice(0, 8).map(route => (
            <Link
              key={route.label}
              to={`/colleges?${new URLSearchParams(route.params).toString()}`}
              className="px-2.5 py-1 text-[11px] bg-card border border-border/60 rounded-full text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              {route.label}
            </Link>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {activeFilters.map(f => (
              <Badge key={f} variant="secondary" className="gap-1 pr-1 text-xs">{f}<button onClick={() => removeFilter(f)} className="ml-1"><X className="w-3 h-3" /></button></Badge>
            ))}
            <button onClick={clearAll} className="text-xs text-primary hover:underline">Clear all</button>
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              <div className="bg-card rounded-2xl border border-border px-4 py-1">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm font-bold text-foreground">Filter By</span>
                  {activeFilters.length > 0 && <button onClick={clearAll} className="text-xs font-semibold text-destructive hover:underline">Clear all</button>}
                </div>
                {filterConfigs.map((fc) => <FilterAccordionGroup key={fc.title} {...fc} />)}
              </div>
              <div className="mt-3 space-y-3">
                <LeadCaptureForm variant="sidebar" title="Need Help Choosing?" subtitle="Get free expert counseling" source="colleges_sidebar" />
                <DynamicAdBanner variant="vertical" position="sidebar" page="colleges" />
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-3">Showing <span className="font-semibold text-foreground">{filtered.length}</span> colleges</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <CollegeCardSkeleton key={i} />)
              ) : (
                filtered.map((college: any, i: number) => (
                  <Fragment key={college.slug}>
                    <CollegeCard college={college} index={Math.min(i, 5)} />
                    {(i + 1) % ITEMS_PER_AD === 0 && i < filtered.length - 1 && (
                      <InlineAdSlot page="colleges" index={Math.floor(i / ITEMS_PER_AD)} source={`colleges_inline_${i}`} />
                    )}
                  </Fragment>
                ))
              )}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {isFetchingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            {!hasMore && filtered.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">You've seen all colleges</p>
            )}

            {/* Empty state intentionally renders blank grid (filters remain visible on the left) */}
            <div className="mt-6">
              <LeadCaptureForm variant="banner" title="📞 Can't find the right college? Get free expert guidance!" subtitle="Our counselors have helped 50,000+ students" source="colleges_bottom_banner" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <FloatingBot />

      <MobileBottomFilter activeCount={activeFilters.length} onOpen={() => setFilterOpen(true)} />
        <MobileFilterSheet filters={filterConfigs} activeCount={activeFilters.length} onClearAll={clearAll} open={filterOpen} onOpenChange={setFilterOpen} resultCount={filtered.length} />
    </div>
  );
}

function FilterSection({ title, items, selected, onChange, singleSelect }: {
  title: string; items: string[]; selected: string[]; onChange: (v: string[]) => void; singleSelect?: boolean
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const filteredItems = filterSearch ? items.filter(i => i.toLowerCase().includes(filterSearch.toLowerCase())) : items;
  const displayItems = showAll ? filteredItems : filteredItems.slice(0, 4);

  const toggle = (item: string) => {
    if (singleSelect) onChange(selected.includes(item) ? [] : [item]);
    else onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-sm font-semibold text-foreground">
        {title}
        {selected.length > 0 && <Badge variant="secondary" className="text-[10px] ml-2 px-1.5">{selected.length}</Badge>}
        <span className="ml-auto">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>
      {expanded && (
        <div className="mt-2">
          {items.length > 10 && (
            <Input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="h-8 text-xs mb-2 rounded-lg" />
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {displayItems.map(item => (
              <label key={item} className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                <Checkbox checked={selected.includes(item)} onCheckedChange={() => toggle(item)} className="w-4 h-4" />
                <span className="text-xs">{item}</span>
              </label>
            ))}
          </div>
          {filteredItems.length > 4 && !filterSearch && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs text-primary hover:underline mt-1">
              {showAll ? "Show less" : `+ ${filteredItems.length - 4} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
