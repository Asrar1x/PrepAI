import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    // useId keeps every label tied to its field even when the caller passes no id or name
    const autoId = React.useId();
    const inputId = id || props.name || autoId;
    const messageId = `${inputId}-message`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {leftIcon && (
            <div className="absolute left-3.5 text-gray-400 group-focus-within:text-brand-400 pointer-events-none flex items-center justify-center transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#141413]/90 text-gray-100 placeholder:text-gray-500 text-sm rounded-xl border border-[#353532] px-3.5 py-2.5 min-h-[44px]',
              'shadow-inner transition-all duration-200',
              'hover:border-brand-500/40',
              'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:bg-[#1A1A19]',
              'disabled:opacity-50 disabled:bg-[#121211] disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/25',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-gray-400 group-focus-within:text-brand-400 flex items-center justify-center transition-colors">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p id={messageId} role="alert" className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
        {!error && hint && <p id={messageId} className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

