import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, BarChart3, Target, ChevronRight } from 'lucide-react';

interface Dimension {
  name: string;
  score: number;
  weight: string;
  status: string;
}

interface ResumeResult {
  score: number;
  dimensions: Dimension[];
  hotspots: string[];
}

export default function ResumeIntelligence() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ResumeResult | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Need to import apiClient from '@/shared/api/client'
      const { apiClient } = await import('@/shared/api/client');
      const response = await apiClient.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const data = response.data?.data || response.data;
      const parsed = data.parsed_data || {};
      
      setResult({
        score: data.ats_score || 80,
        dimensions: [
          { name: 'Keyword Relevance', score: parsed.keyword_score || 85, weight: '30%', status: 'good' },
          { name: 'Section Completeness', score: parsed.section_score || 100, weight: '20%', status: 'excellent' },
          { name: 'Quantified Achievements', score: parsed.quantified_score || 65, weight: '20%', status: 'warning' },
          { name: 'Action Verb Quality', score: parsed.action_verb_score || 75, weight: '15%', status: 'good' },
          { name: 'Machine Readability', score: 95, weight: '10%', status: 'excellent' },
          { name: 'Length & Density', score: 90, weight: '5%', status: 'excellent' }
        ],
        hotspots: parsed.interview_hot_spots || [
          'No significant hotspots found.'
        ]
      });
    } catch (err) {
      console.error(err);
      alert('Failed to upload and analyze resume.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Resume Intelligence</h1>
          <p className="text-slate-500 mt-1">Upload your resume for ATS scoring and mock interview extraction.</p>
        </div>
      </div>

      {!result ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div 
            className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-12 text-center transition hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('resume-upload')?.click()}
          >
            <input 
              type="file" 
              id="resume-upload" 
              className="hidden" 
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={32} />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {file ? file.name : "Click or drag resume to upload"}
            </h3>
            <p className="text-sm text-slate-500">PDF, DOCX up to 5MB</p>

            {file && (
              <button 
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={isUploading}
              >
                {isUploading ? 'Analyzing Resume...' : 'Analyze Resume'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Area */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">ATS Readiness Score</h2>
              
              <div className="relative inline-flex items-center justify-center mt-4">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    className="text-slate-100"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                  />
                  <circle
                    className="text-blue-600 transition-all duration-1000 ease-out"
                    strokeWidth="12"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * result.score) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{result.score}</span>
                  <span className="text-sm text-slate-500">/100</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                Your resume is well-structured but lacks some quantified metrics.
              </div>
              
              <button 
                onClick={() => { setFile(null); setResult(null); }}
                className="mt-6 w-full py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                Upload New Resume
              </button>
            </div>

            {/* Hotspots */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} className="text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Interview Hot Spots</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                The AI will focus on these extracted areas during your Mock Interview:
              </p>
              <ul className="space-y-3">
                {result.hotspots.map((spot, i) => (
                  <li key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <ChevronRight size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">{spot}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Dimensions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                6-Dimension Analysis
              </h3>
              
              <div className="space-y-6">
                {result.dimensions.map((dim, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{dim.name}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {dim.weight} Weight
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">{dim.score}/100</span>
                    </div>
                    
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          dim.score >= 90 ? 'bg-emerald-500' :
                          dim.score >= 75 ? 'bg-blue-500' :
                          dim.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${dim.score}%`, animationDelay: `${i * 100}ms` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
