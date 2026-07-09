import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

interface InlineAdSlotProps {
  page: string;
  index: number;
  source?: string;
}

/**
 * Renders an ad or lead form slot between listing rows.
 * Alternates between ad banners and lead capture forms.
 * If no ad link is configured, it falls back to lead capture.
 */
export function InlineAdSlot({ page, index, source }: InlineAdSlotProps) {
  const isLeadForm = index % 2 === 1;

  if (isLeadForm) {
    return (
      <div className="col-span-full my-2">
        <LeadCaptureForm
          variant="inline"
          title="📞 Need help choosing? Talk to an expert - Free!"
          source={source || `${page}_inline_${index}`}
        />
      </div>
    );
  }

  return (
    <div className="col-span-full my-2">
      <DynamicAdBanner variant="horizontal" position="inline" page={page} />
    </div>
  );
}
