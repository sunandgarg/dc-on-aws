import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";

interface StickyRightSidebarProps {
  source?: string;
  page?: string;
  itemSlug?: string;
  interestedCollegeSlug?: string;
  interestedCourseSlug?: string;
  interestedExamSlug?: string;
}

export function StickyRightSidebar({
  source = "sticky_sidebar",
  page,
  itemSlug,
  interestedCollegeSlug,
  interestedCourseSlug,
  interestedExamSlug,
}: StickyRightSidebarProps) {
  return (
    <aside className="hidden xl:block w-[280px] flex-shrink-0">
      <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
        <LeadCaptureForm
          variant="sidebar"
          title="Get Free Counseling"
          subtitle="Expert guidance for admissions"
          source={source}
          interestedCollegeSlug={interestedCollegeSlug}
          interestedCourseSlug={interestedCourseSlug}
          interestedExamSlug={interestedExamSlug}
        />
        <DynamicAdBanner variant="vertical" position="sidebar" page={page} itemSlug={itemSlug} />
        <DynamicAdBanner variant="square" position="sidebar" page={page} itemSlug={itemSlug} />
      </div>
    </aside>
  );
}
