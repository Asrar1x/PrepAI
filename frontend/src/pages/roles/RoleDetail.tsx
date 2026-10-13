import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Briefcase,
  Building,
  Clock,
  Layers,
  Mic,
  TrendingUp,
  BarChart2
} from '../../components/icons';

export const RoleDetail: React.FC = () => {
  const { roleSlug = 'software-development-engineer' } = useParams<{ roleSlug: string }>();

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', roleSlug],
    queryFn: () => rolesApi.getRoleBySlug(roleSlug),
  });

  if (!isLoading && !role) {
    return (
      <div className="py-20 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Role not found</h1>
        <p className="text-xs text-gray-400">The role you are looking for does not exist.</p>
        <Link to="/roles" className="text-xs text-brand-400 hover:underline">Browse all roles</Link>
      </div>
    );
  }

  if (isLoading || !role) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full h-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Role Header Card */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-brand-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white">{role.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={role.difficulty === 'Hard' ? 'danger' : 'warning'}>
                    {role.difficulty} Track
                  </Badge>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{role.salaryRange}</span>
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              {role.fullDescription}
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link to="/interview">
              <Button variant="primary" size="md" leftIcon={<Mic className="w-4 h-4" />} className="w-full justify-center">
                Launch Voice Mock
              </Button>
            </Link>
            <Link to={`/roles/${role.slug}/gap`}>
              <Button variant="secondary" size="md" leftIcon={<BarChart2 className="w-4 h-4" />} className="w-full justify-center">
                Skill Gap Analyzer
              </Button>
            </Link>
          </div>
        </div>

        {/* Hiring Companies Bar */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold mr-2">
            Campus Recruiters:
          </span>
          {(role.hiringCompanies || ['TCS', 'Infosys', 'Wipro', 'Amazon', 'Zoho']).map((comp) => (
            <span
              key={comp}
              className="text-xs px-3 py-1 rounded-lg bg-[#171716] text-gray-300 border border-gray-700/60 font-medium"
            >
              {comp}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Skills Required Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Technical Skills */}
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Layers className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Technical Core Competencies</h3>
          </div>
          <div className="space-y-3">
            {(role.technicalSkills || []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1F1F1E]/60 border border-gray-800"
              >
                <div>
                  <h4 className="text-xs font-semibold text-gray-200">{skill.name}</h4>
                  <span className="text-[11px] text-gray-400">Required: {skill.proficiencyRequired}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-brand-400 font-semibold">{skill.frequencyScore || 85}%</span>
                  <span className="text-[11px] text-gray-500">Ask Rate</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Soft Skills & Communication */}
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Soft Skills & Articulation</h3>
          </div>
          <div className="space-y-3">
            {(role.softSkills || []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1F1F1E]/60 border border-gray-800"
              >
                <div>
                  <h4 className="text-xs font-semibold text-gray-200">{skill.name}</h4>
                  <span className="text-[11px] text-gray-400">Target Standard: {skill.proficiencyRequired}</span>
                </div>
                <Badge variant="accent" size="sm">Evaluated in HR</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. Company Patterns Table */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Company Exam & Interview Formats</h3>
          </div>
          <span className="text-xs text-gray-400">Verified Campus Patterns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-semibold">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Role Title</th>
                <th className="py-3 px-4">Test Format</th>
                <th className="py-3 px-4">Sections</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(role.companyPatterns || []).map((pat, idx) => (
                <tr key={idx} className="hover:bg-[#1F1F1E]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-100">{pat.companyName}</td>
                  <td className="py-3.5 px-4 text-gray-300">{pat.roleTitle}</td>
                  <td className="py-3.5 px-4 text-gray-400 max-w-xs">{pat.testFormat}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(pat.sections || []).map((sec, sIdx) => (
                        <span key={sIdx} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[11px]">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-300">{pat.durationMinutes} mins</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">{pat.salaryRange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Interview Structure Timeline */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <h3 className="text-base font-bold text-white border-b border-gray-800 pb-3">
          Campus Interview Round Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(role.interviewStructure || []).map((rnd) => (
            <div key={rnd.roundNumber} className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-brand-400">Round 0{rnd.roundNumber}</span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {rnd.durationMinutes}m
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-100">{rnd.name}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{rnd.description}</p>
              <div className="pt-2">
                <div className="text-[11px] text-gray-500 font-semibold">Key Criteria:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(rnd.evaluates || []).map((ev, i) => (
                    <span key={i} className="text-[11px] bg-[#171716] text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
