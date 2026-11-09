import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-[#e8e5dc]/60 rounded-xl ${className}`}
      {...props}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-[#e8e5dc] shadow-xs flex flex-col">
      <Skeleton className="w-full aspect-video rounded-none" />
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f2efe9]">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function InstitutionCardSkeleton() {
  return (
    <div className="w-full rounded-2xl p-5 sm:p-6 bg-white border border-[#e8e5dc] shadow-xs space-y-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="pt-2 flex justify-between items-center border-t border-[#f2efe9]">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      <div className="h-10 w-48 bg-[#e8e5dc]/60 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-28 bg-[#e8e5dc]/60 rounded-2xl" />
        <div className="h-28 bg-[#e8e5dc]/60 rounded-2xl" />
        <div className="h-28 bg-[#e8e5dc]/60 rounded-2xl" />
      </div>
      <div className="h-64 bg-[#e8e5dc]/60 rounded-2xl" />
    </div>
  );
}
