import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'accent' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'accent',
  size = 'md',
  className,
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const colors = {
    accent: 'bg-brand-500',
    secondary: 'bg-brand-500',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-medium text-gray-300">
          {label && <span>{label}</span>}
          {showValue && <span className="text-gray-400 font-mono font-semibold">{percentage}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-[#262624] rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full transition-[width] duration-500 ease-out rounded-full', colors[color])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};

