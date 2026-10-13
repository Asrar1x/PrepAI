import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  return (
    <div
      style={style}
      className={cn(
        'rounded-md bg-[#1E1E1C] animate-pulse',
        className
      )}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'p-6 rounded-lg bg-[#1A1A19] border border-[#353532]/60 space-y-4',
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="w-1/2 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
      <div className="flex justify-between pt-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 w-full">
      <Skeleton className="w-full h-10 rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full h-14 rounded-xl" />
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={cn('w-full rounded-lg bg-[#1A1A19] border border-[#353532]/60 p-6 flex flex-col justify-end space-y-4', height)}>
      <Skeleton className="w-1/4 h-5" />
      <div className="flex items-end justify-between gap-2 h-44 pt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-t-lg"
            style={{ height: `${20 + (i * 12) % 70}%` }}
          />
        ))}
      </div>
    </div>
  );
};

