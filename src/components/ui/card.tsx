// Tiny shadcn-style Card / Badge primitives — local so we don't pull in
// another UI library. Forward refs are not used; these are presentational.
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 border-b border-slate-100', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-slate-800', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />;
}

type BadgeVariant = 'outline' | 'solid';
export function Badge({
  children,
  variant = 'outline',
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  const styles =
    variant === 'solid'
      ? 'bg-indigo-600 text-white'
      : 'border border-slate-300 text-slate-700 bg-white';
  return <span className={cn(base, styles, className)}>{children}</span>;
}
