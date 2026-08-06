import React from 'react';
import { Target, TrendingUp, Calendar, ArrowRight, Zap, Award, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome back, Mohan! 👋</h1>
            <p className="mt-2 text-blue-100 text-lg max-w-xl">
              You're in the top 15% of your batch. Placement season starts in 42 days. Keep your streak going!
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-amber-400 rounded-lg text-amber-900">
              <Zap size={24} className="fill-amber-900" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100 uppercase tracking-wide">Daily Streak</p>
              <p className="text-2xl font-bold">12 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Stats & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-slate-600 font-medium">
                <Target size={20} className="text-emerald-500" /> Average Score
              </div>
              <div className="text-3xl font-extrabold text-slate-900">82%</div>
              <p className="text-sm text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <TrendingUp size={14} /> +4% from last week
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-slate-600 font-medium">
                <CheckCircle size={20} className="text-blue-500" /> Mocks Given
              </div>
              <div className="text-3xl font-extrabold text-slate-900">8</div>
              <p className="text-sm text-slate-500 font-medium mt-2">
                2 Technical, 6 HR
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-slate-600 font-medium">
                <Award size={20} className="text-purple-500" /> Aptitude Solved
              </div>
              <div className="text-3xl font-extrabold text-slate-900">240</div>
              <p className="text-sm text-slate-500 font-medium mt-2">
                Across 10 sessions
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Recent Sessions</h3>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">View All</button>
            </div>
            
            <div className="space-y-4">
              {[
                { title: 'Technical Interview - Amazon Pattern', score: 86, type: 'mock', date: 'Today, 10:00 AM', status: 'Excellent' },
                { title: 'TCS NQT Aptitude Test', score: 72, type: 'aptitude', date: 'Yesterday', status: 'Good' },
                { title: 'HR Round - General', score: 91, type: 'mock', date: 'Aug 3, 2026', status: 'Outstanding' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${activity.type === 'mock' ? 'bg-teal-500' : 'bg-indigo-500'}`}>
                      {activity.score}%
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{activity.title}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={14} /> {activity.date}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Recommendations */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500 rounded-full blur-2xl opacity-50"></div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="text-blue-400" /> AI Recommendation
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Based on your last 3 Technical mocks, you are struggling with <strong className="text-white">System Design</strong> concepts. I suggest taking a customized aptitude test focused purely on System Design theories.
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg">
              Generate Practice Test
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Topic Mastery</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Data Structures</span>
                  <span className="font-bold text-emerald-600">Strong (88%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[88%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Communication</span>
                  <span className="font-bold text-blue-600">Good (75%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[75%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">System Design</span>
                  <span className="font-bold text-rose-600">Weak (42%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[42%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
