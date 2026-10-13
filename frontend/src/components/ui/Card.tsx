import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'outline' | 'glass' | 'premium' | 'accent';
  glow?: boolean;
  /** Darkens the border on hover. */
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow = false, hoverEffect = false, children, ...props }, ref) => {
    const base = 'rounded-lg transition-colors duration-150 text-gray-100';

    const variants = {
      default:
        'bg-[#1A1A19] border border-[#353532]',
      elevated:
        'bg-[#1E1E1C] border border-[#353532] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
      interactive:
        'bg-[#1A1A19] border border-[#353532] hover:border-[#4E4E4A] hover:bg-[#1E1E1C] cursor-pointer',
      outline:
        'bg-transparent border border-[#353532]',
      glass:
        'bg-[#1A1A19] border border-[#353532]',
      premium:
        'bg-[#1A1A19] border border-[#353532]',
      accent:
        'bg-[#1A1A19] border border-brand-500/50',
    };

    return (
      <div
        ref={ref}
        className={cn(
          base,
          variants[variant],
          glow && 'border-brand-500/50',
          hoverEffect && 'hover-lift',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('px-6 pt-5 pb-3 border-b border-[#353532]', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-base font-semibold text-white', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-6 pt-4', className)} {...props}>
    {children}
  </div>
);
