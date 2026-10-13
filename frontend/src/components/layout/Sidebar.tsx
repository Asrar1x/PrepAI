import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Building2,
  BookOpen,
  Mic,
  FileText,
  Award,
  LineChart,
  Flame,
  Bell,
  User,
  ShieldAlert
} from '../icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Sidebar: React.FC = () => {
  const { user: storedUser, isAuthenticated } = useAuthStore();
  // Live profile so XP, level and streak reflect activity since login
  const { pathname } = useLocation();
  const { data: liveUser, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 0,
  });
  // The sidebar stays mounted across pages, so refresh XP and streak after each navigation
  useEffect(() => {
    if (isAuthenticated) void refetch();
  }, [pathname, isAuthenticated, refetch]);
  const user = liveUser || storedUser;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Role Explorer', path: '/roles', icon: Compass },
    { label: 'Company Guides', path: '/companies', icon: Building2 },
    { label: 'Aptitude Practice', path: '/aptitude', icon: BookOpen },
    { label: 'Mock Interview', path: '/interview', icon: Mic, highlight: true },
    { label: 'Resume ATS', path: '/resume', icon: FileText },
    { label: 'Feedback Reports', path: '/report/latest', icon: Award },
    { label: 'Progress Analytics', path: '/analytics/progress', icon: LineChart },
    { label: 'Badges and XP', path: '/gamification', icon: Flame },
    { label: 'Notifications', path: '/profile/notifications', icon: Bell },
    { label: 'My Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-[#121211]/90 border-r border-[#353532]/70 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto z-20">
      {/* Student Mini Profile Header */}
      <div className="p-3.5 mx-3 my-3 bg-[#1E1E1C] border border-[#353532] rounded-lg flex items-center space-x-3 hover:border-brand-500/30 transition-all">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-100 truncate">{user?.name || 'Student Candidate'}</p>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-emerald-400">Level {user?.level ?? 1} • {user?.xpPoints ?? 0} XP</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group select-none relative',
                  isActive
                    ? 'bg-brand-600 text-white font-semibold border border-brand-400/30'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-[#1E1E1C]/80 hover:border-[#353532]/60 border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0 transition-transform', isActive && 'text-brand-200')} />
                  <span className="truncate">{item.label}</span>
                  {item.highlight && (
                    <span className="ml-auto text-[11px] font-medium text-brand-300">
                      Live
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* If Admin, show Quick Admin Switch */}
        {user?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-[#353532]/80">
            <NavLink
              to="/admin"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Theme Toggle & Streak Footer */}
      <div className="p-3 m-3 space-y-2 border-t border-[#353532]/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#1A1A19] border border-[#353532]/80">
          <span className="text-xs font-medium text-gray-300">Theme</span>
          <ThemeToggle size="sm" showLabel />
        </div>

        <div className="p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center text-brand-400">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-orange-300">{user?.streakCount ?? 0} Day Streak</div>
              <div className="text-[11px] text-gray-400">Practise a little every day</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

