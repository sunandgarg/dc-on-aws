import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquarePlus, ShieldCheck, User, Flag, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface Props {
  collegeSlug: string;
  collegeName: string;
  fallbackRating?: number;
  fallbackReviewsCount?: number;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string;
  body: string;
  course?: string;
  year_of_study?: string;
  is_anonymous: boolean;
  created_at: string;
  user_id?: string;
  status?: string;
}

export function CollegeReviews({ collegeSlug, collegeName, fallbackRating = 0, fallbackReviewsCount = 0 }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [reportFor, setReportFor] = useState<Review | null>(null);

  const { data: reviews = [] } = useQuery({
    queryKey: ["college_reviews", collegeSlug, user?.id],
    queryFn: async () => {
      // RLS returns approved + own pending
      const { data } = await (supabase as any)
        .from("college_reviews")
        .select("*")
        .eq("college_slug", collegeSlug)
        .order("created_at", { ascending: false });
      return (data || []) as Review[];
    },
  });
  const approved = reviews.filter((r) => r.status !== "pending" && r.status !== "rejected");
  const myPending = user ? reviews.filter((r) => r.user_id === user.id && r.status === "pending") : [];

  const stats = useMemo(() => {
    if (!approved.length) {
      return { avg: fallbackRating, count: fallbackReviewsCount, dist: [0, 0, 0, 0, 0] };
    }
    const dist = [0, 0, 0, 0, 0];
    let total = 0;
    approved.forEach((r) => {
      total += r.rating;
      dist[5 - r.rating] += 1;
    });
    return { avg: +(total / approved.length).toFixed(1), count: approved.length, dist };
  }, [approved, fallbackRating, fallbackReviewsCount]);

  return (
    <section id="reviews" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Reviews & Ratings</h2>
          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-success" /> Verified student reviews
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gradient-primary text-primary-foreground rounded-full h-9 px-4 gap-2">
          <MessageSquarePlus className="w-4 h-4" /> Write a Review
        </Button>
      </div>

      <div className="flex items-center gap-6 mb-5 flex-wrap">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">{stats.avg || "-"}</p>
          <div className="flex items-center gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(stats.avg) ? "text-golden fill-golden" : "text-muted-foreground"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stats.count} review{stats.count === 1 ? "" : "s"}</p>
        </div>
        <div className="flex-1 min-w-[200px] space-y-1.5">
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = stats.dist[5 - star];
            const pct = stats.count ? Math.round((count / stats.count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">{star}★</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="bg-primary rounded-full h-2" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-foreground w-10">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <ReviewForm
          collegeSlug={collegeSlug}
          collegeName={collegeName}
          user={user}
          onSubmitted={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["college_reviews", collegeSlug] });
          }}
        />
      )}

      {myPending.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            You have {myPending.length} review{myPending.length === 1 ? "" : "s"} awaiting moderator approval. They will appear once approved.
          </p>
        </div>
      )}

      <div className="space-y-3 mt-2">
        {approved.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          approved.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
                      {r.is_anonymous ? "Anonymous Student" : r.reviewer_name || "Student"}
                      <ShieldCheck className="w-3 h-3 text-success" aria-label="Verified" />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {[r.course, r.year_of_study].filter(Boolean).join(" • ")} {r.course ? "•" : ""} {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-golden fill-golden" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <button
                    onClick={() => setReportFor(r)}
                    title="Report this review"
                    className="text-muted-foreground hover:text-destructive transition p-1"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {r.title && <p className="text-sm font-semibold text-foreground mb-1">{r.title}</p>}
              {r.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.body}</p>}
            </div>
          ))
        )}
      </div>

      <ReportDialog review={reportFor} user={user} onClose={() => setReportFor(null)} />
    </section>
  );
}

function ReportDialog({ review, user, onClose }: { review: Review | null; user: any; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!review) return;
    if (reason.trim().length < 5) return toast.error("Please describe the issue (min 5 chars).");
    setSaving(true);
    const { error } = await (supabase as any).from("review_reports").insert({
      review_id: review.id,
      reporter_user_id: user?.id || null,
      reporter_name: user?.user_metadata?.display_name || user?.email || "Guest",
      reason: reason.trim().slice(0, 500),
    });
    // Best-effort increment counter (admin will moderate)
    await (supabase as any).from("college_reviews").update({
      report_count: (review as any).report_count ? (review as any).report_count + 1 : 1,
      last_report_reason: reason.trim().slice(0, 200),
    }).eq("id", review.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks - our moderators will review this.");
    setReason("");
    onClose();
  };

  return (
    <Dialog open={!!review} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>Tell us what's wrong. Our team will review within 24 hours.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you reporting this? (spam, abusive, fake, off-topic...)" rows={4} maxLength={500} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gradient-primary text-primary-foreground rounded-full">
            {saving ? "Reporting..." : "Submit report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewForm({
  collegeSlug,
  collegeName,
  user,
  onSubmitted,
}: {
  collegeSlug: string;
  collegeName: string;
  user: any;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [anon, setAnon] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="bg-muted/40 border border-border rounded-xl p-4 mb-4 text-center">
        <p className="text-sm text-foreground mb-2">Please sign in to write a verified review for {collegeName}.</p>
        <Link to="/auth"><Button size="sm" className="gradient-primary text-primary-foreground rounded-full">Sign in to review</Button></Link>
      </div>
    );
  }

  const submit = async () => {
    if (body.trim().length < 20) {
      toast.error("Please write at least 20 characters in your review.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("college_reviews").insert({
      college_slug: collegeSlug,
      user_id: user.id,
      reviewer_name: user.user_metadata?.display_name || user.email || "Student",
      rating,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 2000),
      course: course.trim().slice(0, 80),
      year_of_study: year.trim().slice(0, 20),
      is_anonymous: anon,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks! Your review is awaiting moderator approval.");
    onSubmitted();
  };

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 mb-4 space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Your rating</label>
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} aria-label={`Rate ${s} stars`}>
              <Star className={`w-7 h-7 ${s <= rating ? "text-golden fill-golden" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Your course (e.g. B.Tech CSE)" />
        <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year (e.g. 2024)" />
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline (e.g. Great campus, supportive faculty)" maxLength={120} />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your honest experience - academics, faculty, placements, hostel, fees, campus life..."
        rows={5}
        maxLength={2000}
      />
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Post anonymously
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSubmitted} className="rounded-full">Cancel</Button>
        <Button onClick={submit} disabled={saving} className="gradient-primary text-primary-foreground rounded-full">
          {saving ? "Posting..." : "Post Review"}
        </Button>
      </div>
    </div>
  );
}
