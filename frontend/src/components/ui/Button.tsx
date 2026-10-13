import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from '../icons';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glow' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E0D] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-brand-600 hover:bg-brand-700 text-white border border-brand-600 hover:border-brand-700',
      secondary:
        'bg-[#1E1E1C] hover:bg-[#2B2B29] text-gray-100 border border-[#3A3A37]',
      ghost:
        'bg-transparent hover:bg-[#262624] text-gray-300 hover:text-white border border-transparent',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600',
      outline:
        'bg-transparent border border-[#3A3A37] text-gray-100 hover:bg-[#1E1E1C] hover:border-[#4E4E4A]',
      glow:
        'bg-brand-600 hover:bg-brand-700 text-white border border-brand-600 hover:border-brand-700',
      glass:
        'bg-[#1E1E1C] hover:bg-[#2B2B29] text-gray-100 border border-[#3A3A37]',
    };

    const sizes = {
      sm:  'text-[13px] px-3 py-1.5 gap-1.5 min-h-[34px]',
      md:  'text-sm px-4 py-2 gap-2 min-h-[40px]',
      lg:  'text-[15px] px-5 py-2.5 gap-2 min-h-[46px]',
      xl:  'text-base px-6 py-3 gap-2.5 min-h-[50px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
