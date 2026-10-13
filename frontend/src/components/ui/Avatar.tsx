import React from 'react';
import { cn } from '../../lib/utils';
import { Mic, User as UserIcon } from '../icons';

export interface AvatarProps {
  name?: string;
  isAI?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'speaking' | 'listening';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  isAI = false,
  size = 'md',
  status,
  className,
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const statusColors = {
    online: 'bg-emerald-400',
    offline: 'bg-gray-500',
    speaking: 'bg-brand-400 animate-ping',
    listening: 'bg-brand-400 animate-pulse',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'rounded-md flex items-center justify-center font-semibold text-gray-200 border',
          isAI
            ? 'bg-brand-600 border-brand-400/50 text-brand-200'
            : 'bg-[#262624] border-[#353532] text-[#F2F2EF]',
          sizes[size],
          className
        )}
      >
        {isAI ? (
          <Mic className={size === 'xl' ? 'w-9 h-9' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UserIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0E0E0D]',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

