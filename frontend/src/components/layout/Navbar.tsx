import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { GraduationCap, Menu, X, LogOut, LayoutDashboard } from '../icons';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    void authApi.logout();
    logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Roles', path: '/roles' },
    { label: 'Aptitude', path: '/aptitude' },
    { label: 'Mock Interview', path: '/interview' },
    { label: 'Resume ATS', path: '/resume' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-colors duration-150',
        scrolled
          ? 'bg-[#0E0E0D] border-b border-[#353532]'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-semibold text-white">PrepAI</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'text-white bg-[#1E1E1C]'
                    : 'text-[#A8A8A2] hover:text-white hover:bg-[#1A1A19]'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="hidden md:flex items-center space-x-3">
          <ThemeToggle size="md" />

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2 pl-3 border-l border-[#353532]">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold border-2 border-brand-400/30 group-hover:border-brand-400/60 transition-colors">
                    {(user.name || user.email || 'User').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-[#A8A8A2] group-hover:text-white max-w-[90px] truncate transition-colors">
                    {(user.name || user.email || 'User').split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#8A8A84] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Create account
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center space-x-2">
          <ThemeToggle size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#A8A8A2] hover:text-white hover:bg-white/5 rounded-lg focus:outline-none transition-all"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-b border-[#353532]/60 bg-[#141413]/95 px-4 pt-3 pb-6 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                location.pathname.startsWith(link.path)
                  ? 'text-brand-300 bg-brand-500/10 border border-brand-500/20'
                  : 'text-[#A8A8A2] hover:text-white hover:bg-[#1A1A19]'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#353532]/60 space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">Go to Dashboard</Button>
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="w-full text-center py-2.5 text-sm text-rose-400 font-medium hover:text-rose-300 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full justify-center">Sign in</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">Get Started Free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
