import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from '../icons';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, hint, id, ...props }, ref) => {
    // useId keeps every label tied to its field even when the caller passes no id or name
    const autoId = React.useId();
    const selectId = id || props.name || autoId;
    const messageId = `${selectId}-message`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative group">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none bg-[#141413]/90 text-gray-100 text-sm rounded-xl border border-[#353532] px-3.5 py-2.5 pr-10 min-h-[44px]',
              'shadow-inner transition-all duration-200 cursor-pointer',
              'hover:border-brand-500/40',
              'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:bg-[#1A1A19]',
              'disabled:opacity-50 disabled:bg-[#121211] disabled:cursor-not-allowed',
              error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/25',
              className
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1A1A19] text-gray-100 py-2">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-brand-400 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p id={messageId} role="alert" className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
        {!error && hint && <p id={messageId} className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

