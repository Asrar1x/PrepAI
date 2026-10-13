import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { aptitudeApi } from '../../api/aptitude';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Clock, ShieldCheck, ArrowRight } from '../../components/icons';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'software-development-engineer', label: 'Software Development Engineer (Core CS + Algorithms)', name: 'Software Development Engineer' },
  { value: 'frontend-engineer', label: 'Frontend Engineer (Web UI, JS/TS, React)', name: 'Frontend Engineer' },
  { value: 'data-analyst', label: 'Data Analyst / BI (SQL, Data Interpretation, EDA)', name: 'Data Analyst' },
  { value: 'devops-cloud-engineer', label: 'DevOps & Cloud (Linux, Docker, Networking)', name: 'DevOps & Cloud Engineer' },
];

export const AptitudeConfig: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('software-development-engineer');
  const [company, setCompany] = useState('tcs');
  const [duration, setDuration] = useState<number>(30);



  const startMutation = useMutation({
    mutationFn: () =>
      aptitudeApi.startSession({
        // Store the readable role name; it is shown in history and on the dashboard
        jobRole: ROLE_OPTIONS.find((r) => r.value === role)?.name || role,
        companyPattern: company,
        durationMinutes: duration,
      }),
    onSuccess: (session) => {
      toast.success('Assessment started! Good luck.');
      navigate(`/aptitude/${session.sessionId}`);
    },
    onError: () => {
      toast.error('Failed to initialize aptitude session.');
    },
  });

  const companyOptions = [
    { value: 'tcs', label: 'TCS (NQT Format - Numerical, Logic & Coding)' },
    { value: 'infosys', label: 'Infosys (Pseudo-code & Reasoning Assessment)' },
    { value: 'zoho', label: 'Zoho (Basic & Advanced Programming Logic)' },
    { value: 'amazon', label: 'Amazon (Analytical & Algorithmic OA)' },
    { value: 'accenture', label: 'Accenture (AMCAT Cognitive & Technical)' },
    { value: 'cognizant', label: 'Cognizant (GenC / Elevate Technical MCQ)' },
    { value: 'standard', label: 'Standard test (all sections)' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="relative p-8 sm:p-9 rounded-xl bg-[#1E1E1C] border border-[#353532] overflow-hidden">

        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-semibold text-[#F2F2EF] tracking-tight">
            Set up an aptitude test
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Pick a company pattern and a time limit. Questions appear one at a time and you cannot go back, as in the real test.
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <Card variant="premium" className="p-7 sm:p-9 space-y-7">
        <div className="space-y-5">
          <Select
            label="Target Engineering Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_OPTIONS}
          />

          <Select
            label="Company Specific Pattern"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            options={companyOptions}
          />

          {/* Duration Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-300">
              Exam Duration
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`p-4 rounded-lg border text-center transition-all duration-200 ${
                    duration === d
                      ? 'bg-brand-600/25 border-brand-500 text-white ring-1 ring-brand-500/50'
                      : 'bg-[#1E1E1C]/60 border-[#353532] text-gray-400 hover:text-gray-200 hover:border-brand-500/40 hover:bg-[#1E1E1C]'
                  }`}
                >
                  <Clock className={`w-5 h-5 mx-auto mb-1.5 ${duration === d ? 'text-brand-400' : 'text-gray-500'}`} />
                  <div className="text-sm font-bold text-white">{d} Minutes</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {d === 30 ? 'Sprint (Quick Drill)' : d === 60 ? 'Standard Mock' : 'Full Company OA'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rules Notice */}
        <div className="p-4 rounded-lg bg-brand-950/30 border border-brand-500/25 flex items-start space-x-3 text-xs text-gray-300">
          <ShieldCheck className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-brand-300">Exam Instructions:</span>
            <p className="text-gray-400 leading-relaxed">
              Once you start, the session timer begins immediately. Questions are adaptive based on current placement cutoffs. Ensure a stable internet connection.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            isLoading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Start Aptitude Assessment
          </Button>
        </div>
      </Card>
    </div>
  );
};

