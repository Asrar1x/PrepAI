import React, { useState } from 'react';
import { Search, Briefcase, Code, BarChart3, Shield, MonitorPlay, Zap, ExternalLink, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiClient } from '@/shared/api/client';

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
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStudyPlan = async (role: any) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const res = await apiClient.post('/intelligence/study-plan', {
        job_role: role.title,
        company_target: "Top Tech"
      });
      setStudyPlan(res.data.plan);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (selectedRole) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setSelectedRole(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors">
          <ArrowLeft size={20} /> Back to Roles
        </button>
        
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold">{selectedRole.title}</h1>
            <p className="mt-2 text-indigo-200 text-lg">Personalized 30-Day Master Study Plan</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : studyPlan ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800">
              <span className="font-bold">AI Insight: </span> {studyPlan.role_specific_tips}
            </div>
            
            {Object.keys(studyPlan).filter(k => k.startsWith('week')).map((weekKey, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-4 capitalize">{weekKey.replace('_', ' ')}: {studyPlan[weekKey].focus}</h3>
                <div className="space-y-4">
                  {studyPlan[weekKey].days.map((day: any, j: number) => (
                    <div key={j} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                        D{day.day}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{day.topic}</h4>
                        <ul className="mt-2 space-y-1">
                          {day.tasks.map((task: string, k: number) => (
                            <li key={k} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Explore Job Roles</h1>
          <p className="mt-2 text-lg text-slate-600 max-w-2xl">
            Understand exactly what companies test for each role, discover your skill gaps, and get a personalized AI preparation plan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Briefcase size={24} />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{role.title}</h3>
            <p className="text-sm font-medium text-emerald-600 mt-1">Avg. Fresher Salary: {role.salary}</p>
            
            <div className="mt-5 flex-grow">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Evaluated Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {role.skills.map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">{skill}</span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-600 font-medium flex items-center gap-1">
                <MonitorPlay size={16} /> {role.rounds} Rounds
              </span>
              <button onClick={() => fetchStudyPlan(role)} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">
                View Plan <ExternalLink size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
