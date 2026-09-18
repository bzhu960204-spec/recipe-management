import * as React from 'react';
import { cn } from '@/lib/utils';

/** The pill used for tags, timings and source labels throughout the app. */
export function Chip({
  className,
  active = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        active ? 'bg-primary text-primary-foreground' : 'bg-chip text-chip-foreground',
        '[&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-card)] border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-[var(--radius-control)] bg-muted', className)} {...props} />;
}
