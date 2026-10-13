import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, LayoutDashboard } from '../components/icons';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-lg bg-[#1F1F1E] border border-gray-800 text-brand-400 flex items-center justify-center mb-6">
        <Compass size={40} />
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md leading-relaxed">
        This link is broken or the page has moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/roles">
          <Button variant="secondary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Explore Roles
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="primary" size="md" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
            Candidate Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
