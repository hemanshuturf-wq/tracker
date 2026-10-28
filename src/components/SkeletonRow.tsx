import { type ReactElement } from 'react';

interface SkeletonRowProps {
  index: number;
}

export function SkeletonRow({ index = 0 }: SkeletonRowProps): ReactElement {
  return (
    <div key={index} className="p-4 flex items-start gap-3">
      <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-3 w-48" />
      </div>
    </div>
  );
}