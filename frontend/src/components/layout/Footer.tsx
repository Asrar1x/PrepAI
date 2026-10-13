import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from '../icons';
import { useAuthStore } from '../../store/authStore';

type FooterLink = { label: string; to: string };

const platformLinks: FooterLink[] = [
  { label: 'Roles', to: '/roles' },
  { label: 'Aptitude Tests', to: '/aptitude' },
  { label: 'Mock Interview', to: '/interview' },
  { label: 'Resume ATS', to: '/resume' },
];

const legalLinks: FooterLink[] = [
  { label: 'Companies', to: '/companies' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms and Conditions', to: '/terms' },
];

export const Footer: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Account links depend on whether someone is signed in (no Sign In link for a signed-in user)
  const accountLinks: FooterLink[] = isAuthenticated
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Progress', to: '/analytics/progress' },
        { label: 'Profile', to: '/profile' },
      ]
    : [
        { label: 'Create account', to: '/register' },
        { label: 'Sign in', to: '/login' },
      ];

  const columns: [string, FooterLink[]][] = [
    ['Platform', platformLinks],
    ['Account', accountLinks],
    ['Company', legalLinks],
  ];

  return (
    <footer className="bg-[#141413] border-t border-[#353532]/60 text-[#A8A8A2] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group w-fit" aria-label="PrepAI home">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">
                PrepAI
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-[#8A8A84]">
              Placement preparation for engineering students: mock interviews, aptitude tests and resume
              screening, with every score explained. The AI models run on the computer PrepAI is installed on.
            </p>
          </div>

          {columns.map(([section, links]) => (
            <div key={section} className="space-y-4">
              <h4 className="text-sm font-semibold text-white">{section}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-xs text-[#8A8A84] hover:text-brand-400 transition-colors duration-200">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#353532]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A8A84]">
          <span>© {new Date().getFullYear()} PrepAI</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
