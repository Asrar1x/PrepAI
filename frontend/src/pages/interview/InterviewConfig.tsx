import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { interviewApi } from '../../api/interview';
import { resumeApi } from '../../api/resume';
import { useInterviewStore } from '../../store/interviewStore';
import {
  InterviewRoundType,
  InterviewPersona
} from '../../types/interview';
import { ATSScoreResult } from '../../types/resume';
import { AI_INTERVIEWER_PERSONAS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Award, ArrowRight, Shield, Layers, Briefcase, Users, FileText } from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const InterviewConfig: React.FC = () => {
  const navigate = useNavigate();
  const { initSession } = useInterviewStore();

  const [role, setRole] = useState('Software Development Engineer');
  const [company, setCompany] = useState('Amazon');
  const [interviewType, setInterviewType] = useState<InterviewRoundType>('Technical Round');
  const [persona, setPersona] = useState<InterviewPersona>('Technical Lead');
  const [activeResume, setActiveResume] = useState<ATSScoreResult | null>(null);

  useEffect(() => {
    resumeApi.getLatestResume()
      .then((resume) => {
        if (resume) {
          setActiveResume(resume);
        }
      })
      .catch(() => {});
  }, []);

  const startMutation = useMutation({
    mutationFn: () =>
      interviewApi.startInterview({
        jobRole: role,
        companyTarget: company,
        interviewType,
        persona,
      }),
    onSuccess: (session) => {
      initSession(
        {
          jobRole: role,
          companyTarget: company,
          interviewType,
          persona,
        },
        session.sessionId,
        session.transcript,
        session.resumeContext
      );
      toast.success('Interview session initialized! Speak clearly into your mic.');
      navigate(`/interview/${session.sessionId}`);
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err));
    },
  });

  const interviewTypes: { type: InterviewRoundType; desc: string; icon: React.ReactNode }[] = [
    { type: 'Technical Round', desc: 'Algorithms, design trade-offs, database schemas and making code faster.', icon: <Layers className="w-4 h-4" /> },
    { type: 'HR Round', desc: 'Questions about past situations, teamwork and why you want the job.', icon: <Users className="w-4 h-4" /> },
    { type: 'Combined Round', desc: 'Half technical questions, half HR questions, as in most campus rounds.', icon: <Award className="w-4 h-4" /> },
    { type: 'Resume Based', desc: 'Questions about the projects, internships and tools on your resume.', icon: <Briefcase className="w-4 h-4" /> },
    { type: 'Case Study / PM Round', desc: 'Open-ended business problems: finding the cause, and choosing what to build first.', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="relative p-8 sm:p-9 rounded-xl bg-[#1E1E1C] border border-[#353532] overflow-hidden">

        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-semibold text-[#F2F2EF] tracking-tight">
            Set up a mock interview
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Choose the round, the interviewer and your target company. The interviewer asks follow-up questions based on your answers and, if you uploaded one, your resume.
          </p>
        </div>
      </div>

      {/* Active Resume Grounding Card */}
      {activeResume && (
        <div className="p-5 rounded-lg bg-[#1E1E1C] border border-brand-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center text-brand-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-brand-400">Target Resume Attached</span>
                <Badge variant="success" size="sm" dot>
                  Ready
                </Badge>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">{activeResume.parsedName || 'Candidate Resume'}</h2>
              <p className="text-xs text-gray-300 mt-0.5">
                {activeResume.hotspots && activeResume.hotspots.length > 0
                  ? `Detected Projects: ${activeResume.hotspots.map(h => h.title).slice(0, 2).join(' • ')}`
                  : '3 Verified Projects Detected (Banking Fraud Detection, Myntra Replica, etc.)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setInterviewType('Resume Based')}
              className={`text-xs px-3.5 py-2 rounded-xl font-medium border transition-all ${
                interviewType === 'Resume Based'
                  ? 'bg-brand-600 text-white border-brand-400'
                  : 'bg-white/5 text-gray-300 border-[#353532] hover:border-brand-500/40'
              }`}
            >
              Select Resume Mode
            </button>
            <div className="text-right pl-3 border-l border-[#353532] hidden sm:block">
              <div className="text-[11px] text-gray-400 font-semibold">ATS Score</div>
              <div className="text-base font-semibold text-emerald-400 font-mono">{activeResume.overallScore}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <Card variant="premium" className="p-7 sm:p-9 space-y-8">
        {/* Role & Company Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            label="Target role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: 'Software Development Engineer', label: 'Software Development Engineer (SDE)' },
              { value: 'Frontend Engineer', label: 'Frontend Engineer' },
              { value: 'Backend Engineer', label: 'Backend Engineer' },
              { value: 'Data Analyst / BI Specialist', label: 'Data Analyst' },
              { value: 'DevOps & Cloud Engineer', label: 'DevOps & Cloud Engineer' },
            ]}
          />

          <Select
            label="Target company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            options={[
              { value: 'Amazon', label: 'Amazon (SDE-1 Standards)' },
              { value: 'Zoho', label: 'Zoho Corporation' },
              { value: 'TCS', label: 'TCS (Digital / Prime)' },
              { value: 'Infosys', label: 'Infosys (Specialist Programmer)' },
              { value: 'Accenture', label: 'Accenture' },
              { value: 'Standard Tech', label: 'Standard Tech Startup' },
            ]}
          />
        </div>

        {/* Interview Type Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-300">
            Round type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {interviewTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setInterviewType(item.type)}
                className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                  interviewType === item.type
                    ? 'bg-brand-600/25 border-brand-500 text-white ring-1 ring-brand-500/50'
                    : 'bg-[#1E1E1C]/60 border-[#353532] text-gray-300 hover:border-brand-500/40 hover:bg-[#1E1E1C]'
                }`}
              >
                <div className="flex items-center space-x-2 text-brand-400 mb-1.5">
                  {item.icon}
                  <span className="text-sm font-bold text-gray-100">{item.type}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Persona Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-300">
            Interviewer
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AI_INTERVIEWER_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id as InterviewPersona)}
                className={`p-5 rounded-lg border text-left transition-colors duration-150 flex items-start ${
                  persona === p.id
                    ? 'bg-[#1F2B47] border-brand-500 text-white'
                    : 'bg-[#1E1E1C]/60 border-[#353532] text-gray-300 hover:border-brand-500/40 hover:bg-[#1E1E1C]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-100">{p.name}</h4>
                  </div>
                  <div className="text-xs text-gray-300 font-medium">{p.style}</div>
                  <p className="text-[11px] text-gray-400 leading-relaxed pt-1">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            isLoading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Start interview
          </Button>
        </div>
      </Card>
    </div>
  );
};

