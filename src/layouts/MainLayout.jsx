import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Compass, BrainCircuit, Mic, User } from 'lucide-react';

export default function MainLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Role Explorer', path: '/', icon: Compass },
    { name: 'Aptitude Test', path: '/aptitude', icon: BrainCircuit },
    { name: 'Mock Interview', path: '/mock-interview', icon: Mic },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <nav className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            PrepAI
          </span>
        </div>
        
        <div className="hidden md:flex space-x-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
            <User size={18} />
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
