import React from 'react';
import { Search, Briefcase, Code, BarChart3, Shield, MonitorPlay, Zap, ExternalLink } from 'lucide-react';

const categories = [
  { name: 'Software Engineering', count: 6 },
  { name: 'Data & AI', count: 4 },
  { name: 'Management', count: 3 },
  { name: 'Specialized', count: 4 },
];

const roles = [
  { title: 'Software Developer (SDE)', category: 'Software Engineering', salary: '₹6L - ₹15L', skills: ['DSA', 'System Design', 'OOPs', 'DBMS'], rounds: 4, hot: true },
  { title: 'Data Analyst', category: 'Data & AI', salary: '₹5L - ₹12L', skills: ['SQL', 'Python', 'PowerBI', 'Statistics'], rounds: 3, hot: false },
  { title: 'Product Manager', category: 'Management', salary: '₹8L - ₹18L', skills: ['Agile', 'Wireframing', 'Strategy', 'Analytics'], rounds: 4, hot: true },
  { title: 'Frontend Developer', category: 'Software Engineering', salary: '₹5L - ₹14L', skills: ['React', 'JavaScript', 'Tailwind', 'Web Vitals'], rounds: 3, hot: false },
  { title: 'Cybersecurity Analyst', category: 'Specialized', salary: '₹7L - ₹16L', skills: ['Networking', 'Pen Testing', 'Linux', 'Cryptography'], rounds: 3, hot: false },
  { title: 'Machine Learning Eng.', category: 'Data & AI', salary: '₹10L - ₹20L', skills: ['PyTorch', 'TensorFlow', 'Maths', 'MLOps'], rounds: 5, hot: true },
];

export default function RoleExplorer() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Explore Job Roles</h1>
          <p className="mt-2 text-lg text-slate-600 max-w-2xl">
            Understand exactly what companies test for each role, discover your skill gaps, and get a personalized AI preparation plan.
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search roles or skills..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition">All Roles</button>
        {categories.map((cat, i) => (
          <button key={i} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-50 transition shadow-sm">
            {cat.name} <span className="ml-2 text-slate-400">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                {role.category === 'Software Engineering' && <Code size={24} />}
                {role.category === 'Data & AI' && <BarChart3 size={24} />}
                {role.category === 'Management' && <Briefcase size={24} />}
                {role.category === 'Specialized' && <Shield size={24} />}
              </div>
              {role.hot && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  <Zap size={12} className="fill-amber-700" /> HOT
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{role.title}</h3>
            <p className="text-sm font-medium text-emerald-600 mt-1">Avg. Fresher Salary: {role.salary}</p>
            
            <div className="mt-5 flex-grow">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Evaluated Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {role.skills.map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-600 font-medium flex items-center gap-1">
                <MonitorPlay size={16} /> {role.rounds} Rounds
              </span>
              <button className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">
                View Details <ExternalLink size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
