import React, { useEffect, useState } from 'react';
import { Download, Share2, Check, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/shared/api/client';

export default function FeedbackReport() {
  const { id } = useParams();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Poll every 3 seconds until status is completed
      const interval = setInterval(async () => {
        try {
          const res = await apiClient.get(`/interview/${id}`);
          if (res.data.status === 'completed') {
            setReportData(res.data);
            setLoading(false);
            clearInterval(interval);
          }
        } catch (e) {
          console.error(e);
          clearInterval(interval);
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-slate-800">Generating AI Report...</h2>
        <p className="text-slate-500">Please wait while our models evaluate your interview.</p>
      </div>
    );
  }

  const score = reportData?.overall_score ? Math.round(reportData.overall_score * 10) : 0;
  const grade = score > 80 ? 'A - Strong Candidate' : score > 60 ? 'B - Average' : 'C - Needs Improvement';
  const pdfUrl = `http://localhost:8000${reportData?.report_url}`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Interview Analysis Report</h1>
          <p className="text-slate-500 font-medium mt-1">Session ID: {id}</p>
        </div>
        <div className="flex gap-3">
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md shadow-blue-200">
            <Download size={18} /> Download PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
          
          <h3 className="text-indigo-200 font-medium uppercase tracking-wider text-sm mb-4">Overall Grade</h3>
          <div className="text-7xl font-black mb-2 tracking-tighter">{score}<span className="text-3xl text-indigo-400">%</span></div>
          <p className="text-emerald-400 font-bold text-xl mb-6">{grade}</p>
        </div>

        {/* AI Summary */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart2 className="text-blue-500" /> Executive Summary
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Your interview for the {reportData?.job_role || 'SDE'} role is completed. Our AI evaluated your technical answers and communication quality.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-2">
                <Check size={18} /> Top Strengths
              </h4>
              <ul className="text-sm text-emerald-700 space-y-1 ml-6 list-disc">
                {reportData?.feedback_report?.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>) || <li>Solid concepts</li>}
              </ul>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
                <AlertTriangle size={18} /> Areas for Improvement
              </h4>
              <ul className="text-sm text-rose-700 space-y-1 ml-6 list-disc">
                {reportData?.feedback_report?.improvements?.map((s: string, i: number) => <li key={i}>{s}</li>) || <li>Add more details</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
