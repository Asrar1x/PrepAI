import React, { useEffect } from 'react';
import { X } from '../icons';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E0E0D]/85 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative w-full bg-[#1E1E1C] border border-[#353532] rounded-lg shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(74,118,217,0.12)] z-10 overflow-hidden transform transition-all',
          maxWidths[maxWidth]
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#353532]/80 bg-[#1A1A19]/60">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-100 tracking-tight">
                {title}
              </h3>
            )}
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent hover:border-[#353532] transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

