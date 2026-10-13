import React from 'react';
import { Sun, Moon } from '../icons';
import { useUiStore } from '../../store/uiStore';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md'
}) => {
  const { theme, toggleTheme } = useUiStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ${
        size === 'sm' ? 'p-1.5 text-xs' : 'p-2 text-sm'
      } ${
        isDark
          ? 'bg-[#1F1F1E] hover:bg-[#232334] text-amber-400 border border-gray-800 hover:border-gray-700 shadow-sm'
          : 'bg-white hover:bg-gray-100 text-brand-600 border border-gray-200 shadow-sm hover:border-gray-300'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-brand-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
        )}
      </div>

      {showLabel && (
        <span className="font-semibold text-xs select-none">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
