import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  ShieldAlert,
  BarChart3,
  Users,
  UploadCloud,
  Rocket,
  Calendar,
  Download,
  ArrowLeft
} from '../icons';
import { cn } from '../../lib/utils';

export const AdminSidebar: React.FC = () => {
  const adminNav = [
    { label: 'Admin Overview', path: '/admin', icon: ShieldAlert },
    { label: 'Batch Analytics', path: '/admin/batches', icon: BarChart3 },
    { label: 'Student Management', path: '/admin/students', icon: Users },
    { label: 'Question Bank Upload', path: '/admin/questions/upload', icon: UploadCloud },
    { label: 'Drive Activation', path: '/admin/drives', icon: Rocket },
    { label: 'Scheduled Events', path: '/admin/events', icon: Calendar },
    { label: 'Report Export', path: '/admin/reports', icon: Download },
  ];

  return (
    <aside className="w-64 bg-[#121211]/90 border-r border-[#353532]/70 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto z-20">
      {/* Admin Badge Header */}
      <div className="p-3.5 mx-3 my-3 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center space-x-3">
        <div className="flex items-center text-amber-300 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-amber-300">Placement TPO</h4>
          <p className="text-[11px] text-gray-400">Institutional Admin</p>
        </div>
      </div>

      {/* Admin Nav */}
      <nav className="flex-1 px-3 space-y-1 pb-4">
        {adminNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group select-none',
                  isActive
                    ? 'bg-amber-700 text-white font-semibold border border-amber-400/30'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-[#1E1E1C]/80 hover:border-[#353532]/60 border border-transparent'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Exit Admin Mode */}
      <div className="p-3 m-3 border-t border-[#353532]/60">
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/25 transition-all justify-center shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch to Student View</span>
        </Link>
      </div>
    </aside>
  );
};

