import React from 'react';
import { cn } from '@/utils/cn';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--border)]", className)}
      {...props}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      <Skeleton className="w-full h-48 rounded-none" />
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const ClubSkeleton = () => {
  return (
    <div className="flex flex-col rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)] h-full shadow-sm">
      <Skeleton className="h-7 w-2/3 rounded-md mb-4" />
      <div className="space-y-2 mb-6 flex-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-auto pt-4 border-t border-[var(--border)] flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
};
