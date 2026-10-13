import React from 'react';
import { AlertTriangle, RefreshCw } from '../icons';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading this section. Please try again.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-rose-950/20 border border-rose-500/25 rounded-lg max-w-lg mx-auto shadow-xl',
        className
      )}
    >
      <div className="flex items-center text-rose-400 mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-rose-200 tracking-tight">{title}</h4>
      <p className="text-sm text-rose-200/70 mt-2 max-w-xs leading-relaxed">{description}</p>
      {onRetry && (
        <div className="mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

