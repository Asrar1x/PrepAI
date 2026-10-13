import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' | 'solid' | 'outline' | 'glow' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded border';

  const variants = {
    accent:     'bg-brand-500/10 text-brand-300 border-brand-500/30',
    secondary:  'bg-brand-500/10 text-brand-300 border-brand-500/30',
    success:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
    warning:    'bg-amber-500/12 text-amber-400 border-amber-500/25',
    danger:     'bg-rose-500/12 text-rose-400 border-rose-500/25',
    neutral:    'bg-[#1E1E1C] text-gray-300 border-[#353532]',
    solid:      'bg-brand-600 text-white border-brand-600',
    outline:    'bg-transparent text-gray-400 border-[#353532]',
    glow:       'bg-brand-500/10 text-brand-300 border-brand-500/30',
    cyan:       'bg-brand-500/12 text-brand-400 border-brand-500/25',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-px',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1',
  };

  const dotColors: Record<string, string> = {
    accent: 'bg-brand-400',
    secondary: 'bg-brand-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    neutral: 'bg-gray-400',
    solid: 'bg-white',
    outline: 'bg-gray-400',
    glow: 'bg-brand-400',
    cyan: 'bg-brand-400',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
