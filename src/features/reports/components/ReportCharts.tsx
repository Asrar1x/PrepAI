import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ScoreDimension } from '../types';

export function DimensionRadar({ dimensions }: { dimensions: ScoreDimension[] }) {
  const data = dimensions.map((dimension) => ({ subject: dimension.label.replace(' ', '\n'), score: dimension.score, benchmark: dimension.benchmark }));
  return (
    <div className="h-[330px] w-full" role="img" aria-label="Radar chart comparing interview scores to the role benchmark">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#dbe2ef" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
          <Radar name="Your score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.24} />
          <Radar name="Benchmark" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} />
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return <div className="relative grid h-40 w-40 place-items-center" aria-label={`${label}: ${score} out of 100`}>
    <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="56" cy="56" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle cx="56" cy="56" r={radius} fill="none" stroke="#6366f1" strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
    </svg>
    <div className="absolute text-center"><strong className="block text-4xl tracking-tight text-slate-950">{score}</strong><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span></div>
  </div>;
}
