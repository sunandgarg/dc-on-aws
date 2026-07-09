import { useState, useMemo, Fragment, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { CourseCard } from "@/components/CourseCard";
import { CourseCardSkeleton } from "@/components/SkeletonCards";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { InlineAdSlot } from "@/components/InlineAdSlot";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { MobileBottomFilter } from "@/components/MobileBottomFilter";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { getCourseHeading, courseSeoRoutes } from "@/lib/seoSlugs";
import { useSEO } from "@/hooks/useSEO";
import { parseCourseSlug, filtersToSlug } from "@/lib/seoSlugRoutes";
import { useCanonical } from "@/hooks/useCanonical";
import { getCourseGroupSearchTerms, normalizeCourseGroup, readMultiParam, resolveFacetCategories, uniqueValues, writeMultiParam } from "@/lib/listingFilters";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  courseStreams, courseCourseGroups, courseSpecializations,
  courseModes, courseDurations,
} from "@/data/indianLocations";

const topSearches = ["B.Tech", "MBA", "MBBS", "B.Sc", "BBA", "MCA", "B.Com", "LLB"];

export default function AllCourses() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const seoSlugFilters = useMemo(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[2]?.startsWith("top-")) {
      return parseCourseSlug(pathParts.slice(2).join("-"));
    }
    return {};
  }, [location.pathname]);

  const [selectedStreams, setSelectedStreams] = useState<string[]>(() => {
    return readMultiParam(searchParams, "stream", seoSlugFilters.stream ? [seoSlugFilters.stream] : []);
  });
  const [selectedCourseGroups, setSelectedCourseGroups] = useState<string[]>(() => {
    return readMultiParam(searchParams, "group", seoSlugFilters.group ? [normalizeCourseGroup(seoSlugFilters.group)] : []).map(normalizeCourseGroup);
  });
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>(() => readMultiParam(searchParams, "mode", seoSlugFilters.mode ? [seoSlugFilters.mode] : []));
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);

  // Hydrate from URL whenever it changes
  useEffect(() => {
    setSelectedStreams(readMultiParam(searchParams, "stream", seoSlugFilters.stream ? [seoSlugFilters.stream] : []));
    setSelectedCourseGroups(readMultiParam(searchParams, "group", seoSlugFilters.group ? [normalizeCourseGroup(seoSlugFilters.group)] : []).map(normalizeCourseGroup));
    setSelectedModes(readMultiParam(searchParams, "mode", seoSlugFilters.mode ? [seoSlugFilters.mode] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useCanonical();

  const dbFilters = useMemo(() => {
    const f: Record<string, string | string[] | undefined> = {};
    const categories = resolveFacetCategories(selectedStreams, selectedCourseGroups);
    if (categories.length > 0) f.category = categories.length === 1 ? categories[0] : categories;
    if (selectedModes.length > 0) f.mode = selectedModes.length === 1 ? selectedModes[0] : selectedModes;
    return f;
  }, [selectedStreams, selectedCourseGroups, selectedModes]);

  // When user picks a course group like "M.Sc", search course name for it.
  const effectiveSearch = useMemo(() => {
    if (search) return search;
    return undefined;
  }, [search]);

  const courseGroupSearch = useMemo(() => getCourseGroupSearchTerms(selectedCourseGroups), [selectedCourseGroups]);

  const { items: courses, sentinelRef, isLoading, isFetchingMore, hasMore } = useInfiniteData({
    table: "courses",
    queryKey: ["infinite-courses"],
    orderBy: "priority",
    ascending: true,
    nullsFirst: false,
    extraOrders: [
      { column: "name", ascending: true },
    ],
    filters: dbFilters,
    search: effectiveSearch,
    searchGroups: courseGroupSearch.length > 0 ? [{ terms: courseGroupSearch, fields: ["name", "full_name", "category", "level", "description"] }] : [],
    searchFields: ["name", "full_name", "category", "mode", "level"],
  });

  useEffect(() => {
    const useQueryUrl = [selectedStreams, selectedCourseGroups, selectedModes].some((v) => v.length > 1) || (selectedStreams.length > 0 && selectedCourseGroups.length > 0);

    if (useQueryUrl) {
      const params = new URLSearchParams();
      writeMultiParam(params, "stream", selectedStreams);
      writeMultiParam(params, "group", selectedCourseGroups);
      writeMultiParam(params, "mode", selectedModes);
      const newPath = params.toString() ? `/courses?${params.toString()}` : "/courses";
      if (`${location.pathname}${location.search}` !== newPath) navigate(newPath, { replace: true });
      return;
    }

    const filters: Record<string, string> = {};
    if (selectedCourseGroups.length === 1) filters.group = selectedCourseGroups[0];
    else if (selectedStreams.length === 1) filters.stream = selectedStreams[0];
    if (selectedModes.length === 1) filters.mode = selectedModes[0];

    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) {
      const slug = filtersToSlug("courses", filters);
      const newPath = `/courses/${slug}`;
      if (`${location.pathname}${location.search}` !== newPath) navigate(newPath, { replace: true });
    } else if (`${location.pathname}${location.search}` !== "/courses") {
      navigate("/courses", { replace: true });
    }
  }, [selectedStreams, selectedCourseGroups, selectedModes, navigate, location.pathname, location.search]);

  const activeFilters = uniqueValues([...selectedStreams, ...selectedCourseGroups, ...selectedSpecializations, ...selectedModes, ...selectedDurations]);

  const filtered = useMemo(() => {
    // Course group is wired into the server-side `effectiveSearch` (ilike on name).
    // Only secondary client filter remaining is duration.
    return courses.filter((c: any) => {
      const matchDuration = selectedDurations.length === 0 || selectedDurations.includes(c.duration);
      return matchDuration;
    });
  }, [courses, selectedDurations]);

  const heading = useMemo(() => getCourseHeading({
    courseGroup: selectedCourseGroups[0],
    stream: selectedStreams[0],
    mode: selectedModes[0],
    duration: selectedDurations[0],
  }), [selectedStreams, selectedCourseGroups, selectedModes, selectedDurations]);

  useSEO({ title: heading, description: `Browse ${heading.toLowerCase()} - eligibility, duration, fees, top colleges and career options.` });

  const clearAll = () => {
    setSelectedStreams([]); setSelectedCourseGroups([]);
    setSelectedSpecializations([]); setSelectedModes([]); setSelectedDurations([]);
  };

  const removeFilter = (f: string) => {
    setSelectedStreams(prev => prev.filter(x => x !== f));
    setSelectedCourseGroups(prev => prev.filter(x => x !== f));
    setSelectedSpecializations(prev => prev.filter(x => x !== f));
    setSelectedModes(prev => prev.filter(x => x !== f));
    setSelectedDurations(prev => prev.filter(x => x !== f));
  };

  const filterConfigs = [
    { title: "Streams", items: courseStreams, selected: selectedStreams, onChange: setSelectedStreams },
    { title: "Course Groups", items: courseCourseGroups, selected: selectedCourseGroups, onChange: (v: string[]) => setSelectedCourseGroups(uniqueValues(v.map(normalizeCourseGroup))) },
    { title: "Specializations", items: courseSpecializations, selected: selectedSpecializations, onChange: setSelectedSpecializations },
    { title: "Course Modes", items: courseModes, selected: selectedModes, onChange: setSelectedModes },
    { title: "Duration", items: courseDurations, selected: selectedDurations, onChange: setSelectedDurations },
  ];

  const ITEMS_PER_AD = 6;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="courses" />
      <main className="px-3 md:container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "Courses" }]} />
        <header className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-primary mb-1">{heading}</h1>
          <p className="text-sm text-muted-foreground">Explore {filtered.length}+ courses - compare eligibility, fees, career prospects & top colleges</p>
        </header>

        <AlsoCheckSection variant="strip" className="mb-4" />

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses (e.g. B.Tech, MBA, MBBS...)" className="pl-10 rounded-xl h-10" />
          </div>
        </div>

        {/* SEO Quick Links */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {courseSeoRoutes.slice(0, 6).map(route => (
            <Link key={route.label} to={`/courses?${new URLSearchParams(route.params).toString()}`}
              className="px-2.5 py-1 text-[11px] bg-card border border-border/60 rounded-full text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
              {route.label}
            </Link>
          ))}
        </div>

        {/* Top Searches - mobile only */}
        <div className="lg:hidden mb-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Top Searches</p>
          <div className="flex flex-wrap gap-1.5">
            {topSearches.map(s => (
              <button key={s} onClick={() => setSearch(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  search === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"
                }`}>{s}</button>
            ))}
          </div>
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
            <div className="sticky top-20 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">Filter by</span>
                {activeFilters.length > 0 && <button onClick={clearAll} className="text-xs text-destructive hover:underline">Reset all</button>}
              </div>
              {filterConfigs.map(fc => <FilterSection key={fc.title} {...fc} />)}
              <LeadCaptureForm variant="sidebar" title="Confused About Courses?" subtitle="Get free career counseling" source="courses_sidebar" />
              <DynamicAdBanner variant="vertical" position="sidebar" page="courses" />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-3">Showing <span className="font-semibold text-foreground">{filtered.length}</span> courses</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
              ) : (
                filtered.map((course: any, i: number) => (
                  <Fragment key={course.slug}>
                    <CourseCard course={course} index={Math.min(i, 5)} />
                    {(i + 1) % ITEMS_PER_AD === 0 && i < filtered.length - 1 && (
                      <InlineAdSlot page="courses" index={Math.floor(i / ITEMS_PER_AD)} source={`courses_inline_${i}`} />
                    )}
                  </Fragment>
                ))
              )}
            </div>

            <div ref={sentinelRef} className="h-4" />
            {isFetchingMore && (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            )}
            {!hasMore && filtered.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">You've seen all courses</p>
            )}

            {/* Empty state intentionally renders blank grid */}
            <div className="mt-6">
              <LeadCaptureForm variant="banner" title="📚 Not sure which course is right? Talk to an expert!" subtitle="Our counselors analyze your interests, scores & goals" source="courses_bottom_banner" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingBot />

      <MobileBottomFilter activeCount={activeFilters.length} onOpen={() => setFilterOpen(true)} />
      <MobileFilterSheet filters={filterConfigs} activeCount={activeFilters.length} onClearAll={clearAll} open={filterOpen} onOpenChange={setFilterOpen} />
    </div>
  );
}

function FilterSection({ title, items, selected, onChange }: { title: string; items: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const filteredItems = filterSearch ? items.filter(i => i.toLowerCase().includes(filterSearch.toLowerCase())) : items;
  const displayItems = showAll ? filteredItems : filteredItems.slice(0, 4);

  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
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
          {items.length > 10 && <Input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="h-8 text-xs mb-2 rounded-lg" />}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {displayItems.map(item => (
              <label key={item} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
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
