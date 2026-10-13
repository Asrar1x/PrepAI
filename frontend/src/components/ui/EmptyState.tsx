import React from 'react';
import { Button } from './Button';
import { Inbox } from '../icons';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  heading,
  description,
  actionText,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#1E1E1C]/60 border border-[#353532]/80 rounded-lg max-w-lg mx-auto shadow-xl',
        className
      )}
    >
      <div className="flex items-center text-brand-400 mb-4">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h4 className="text-base font-semibold text-gray-100 tracking-tight">{heading}</h4>
      <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};

