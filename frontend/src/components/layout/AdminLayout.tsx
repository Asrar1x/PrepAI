import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AdminSidebar } from './AdminSidebar';
import { Footer } from './Footer';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#121211] text-gray-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      <Navbar />
      <div className="flex flex-1 pt-16">
        <div className="hidden md:block">
          <AdminSidebar />
        </div>
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-16 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};
