import { Skeleton } from "@/components/ui/skeleton";

export function CollegeCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden h-full flex flex-col">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-2 mt-auto pt-3">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden h-full flex flex-col">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 flex-1 flex flex-col space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ExamCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 h-full flex flex-col space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-2 gap-2 mt-auto pt-3">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}
