import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0E0E0D] text-[#F2F2EF] flex flex-col font-sans selection:bg-brand-600 selection:text-white relative">
      {/* Top Fixed Navbar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex flex-1 pt-16">
        {/* Left Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Dynamic Route Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-16 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Bottom Footer */}
      <Footer />
    </div>
  );
};

