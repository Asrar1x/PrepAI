import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertTriangle, Briefcase, Activity, ChevronRight, Download, PlayCircle, BarChart2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function AdminPanel() {
  const [selectedBatch, setSelectedBatch] = useState('BTech CS 2026');
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, analyticsRes] = await Promise.all([
          apiClient.get('/admin/students'),
          apiClient.get('/admin/analytics')
        ]);
        setStudents(studentRes.data);
        setAnalytics(analyticsRes.data);
      } catch (e) {
        console.error("Failed to load admin data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const exportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Email,Total XP,Current Streak,Status\n"
      + students.map(s => `${s.name},${s.email},${s.total_xp},${s.current_streak},${s.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "batch_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin & Placement Panel</h1>
          <p className="text-slate-500 mt-1">Batch oversight, analytics, and drive management.</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option>BTech CS 2026</option>
            <option>BTech IT 2026</option>
            <option>MCA 2026</option>
          </select>
          <button onClick={exportReport} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Registered</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{analytics?.overview.total_students || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Interviews Given</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{analytics?.overview.total_interviews_given || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Batch Avg Score</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{analytics?.overview.batch_average_score}%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Placement Readiness</p>
          <p className="text-3xl font-bold text-emerald-600 mb-2">{analytics?.overview.placement_readiness}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-6">
            <BarChart2 size={18} className="text-blue-600" />
            Department Performance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.charts.department_performance || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Radar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-6">
            <Activity size={18} className="text-indigo-600" />
            Batch Skill Radar vs Industry
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics?.charts.skills_radar || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" tick={{fontSize: 12}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Batch Avg" dataKey="batch_avg" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Radar name="Industry Req" dataKey="industry_req" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Student Drill Down */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Student List
          </h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search student..."
              className="pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="pb-3 font-medium">Student Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium text-center">Total XP</th>
                <th className="pb-3 font-medium text-center">Current Streak</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {students.map((student, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-4">
                    <div className="font-medium text-slate-900">{student.name}</div>
                  </td>
                  <td className="py-4 text-slate-600">{student.email}</td>
                  <td className="py-4 text-center text-slate-700 font-medium">{student.total_xp} XP</td>
                  <td className="py-4 text-center text-amber-600 font-bold">{student.current_streak}🔥</td>
                  <td className="py-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
