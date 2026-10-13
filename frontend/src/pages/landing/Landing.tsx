import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useQuery } from '@tanstack/react-query';
import { rolesApi, companiesApi } from '../../api/roles';

const STEPS = [
  { title: 'Pick what you are preparing for', text: 'Job role, company test pattern, round type and the kind of interviewer you want to face.' },
  { title: 'Answer out loud', text: 'The interviewer reads each question aloud and asks a follow-up based on what you actually said.' },
  { title: 'Keep the camera on', text: 'A frame every ten seconds is checked for eye line, posture, framing and dress, then deleted.' },
  { title: 'Read the report', text: 'Each score quotes the part of your answer it came from, and lists what to fix first.' },
];

const MODULES = [
  {
    title: 'Mock interviews',
    text: 'Technical, HR, combined, resume-based and case rounds. Answers are graded on correctness, relevance, technical depth, completeness, reasoning, clarity and communication.',
    to: '/interview',
  },
  {
    title: 'Aptitude tests',
    text: 'Timed quantitative, logical and verbal sections in the format of the company you pick. Every question has a worked solution.',
    to: '/aptitude',
  },
  {
    title: 'Resume check',
    text: 'Upload a PDF and see which skills a role asks for that your resume does not show yet, plus rewrites for weak bullet points.',
    to: '/resume',
  },
  {
    title: 'Progress over time',
    text: 'Scores from every session in one place, so you can see whether a weak topic is actually getting better.',
    to: '/analytics/progress',
  },
];

export const Landing: React.FC = () => {
  // Real counts from the API, not marketing numbers
  const { data: roleList } = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.getRoles() });
  const { data: companyList } = useQuery({ queryKey: ['companies'], queryFn: () => companiesApi.getCompanies() });

  const facts = [
    { value: roleList ? String(roleList.length) : 'N/A', label: 'job roles' },
    { value: companyList ? String(companyList.length) : 'N/A', label: 'company test patterns' },
    { value: '7', label: 'things each answer is graded on' },
    { value: '5', label: 'interview round types' },
  ];

  return (
    <div className="min-h-screen bg-[#0E0E0D] text-gray-100 flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-7">
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold text-white">
                Practice your placement interview before the real one.
              </h1>
              <p className="mt-6 text-lg text-[#A8A8A2] max-w-xl leading-relaxed">
                Mock interviews you answer out loud, aptitude tests in each company's format, and a
                resume check. Every score shows the answer it was based on.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Link to="/interview">
                  <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                    Start a mock interview
                  </Button>
                </Link>
                <Link to="/roles" className="text-sm font-medium text-gray-300 hover:text-white underline underline-offset-4 decoration-[#4E4E4A] hover:decoration-gray-300 transition-colors">
                  Browse job roles first
                </Link>
              </div>
            </div>

            <aside className="lg:col-span-5 lg:pt-2">
              <h2 className="text-sm font-semibold text-gray-300">How a mock interview works</h2>
              <ol className="mt-4 border-t border-[#353532]">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-3 py-4 border-b border-[#353532]">
                    <span className="font-mono text-sm text-brand-400 pt-px">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="text-[15px] font-medium text-gray-100">{step.title}</div>
                      <p className="mt-1 text-sm text-[#A8A8A2] leading-relaxed">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        {/* Facts, counted from the database */}
        <section className="border-y border-[#353532] bg-[#141413]">
          <dl className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4">
            {facts.map(({ value, label }, i) => (
              <div
                key={label}
                className={`py-8 pr-4 ${i % 2 === 1 ? 'pl-6 border-l border-[#353532]' : ''} ${i === 2 ? 'md:pl-6 md:border-l md:border-[#353532]' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-[#353532]' : ''}`}
              >
                <dt className="sr-only">{label}</dt>
                <dd className="font-mono text-3xl font-medium text-white">{value}</dd>
                <dd className="mt-1 text-sm text-[#A8A8A2]">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Why */}
        <section className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <h2 className="lg:col-span-5 text-3xl sm:text-4xl font-semibold text-white">
              Reading answers is not the same as saying them.
            </h2>
            <div className="lg:col-span-7 space-y-5 text-[#A8A8A2] text-base leading-relaxed max-w-2xl">
              <p>
                Most students prepare by reading question banks. Then in the actual round, the interviewer
                asks a follow-up, the answer comes out half-formed, and nobody tells you which part went wrong.
              </p>
              <p>
                PrepAI makes you answer out loud, asks the follow-up, and marks each answer against a fixed
                rubric. The report quotes your own words next to every score, so you can see exactly where
                an answer lost marks.
              </p>
            </div>
          </div>
        </section>

        {/* What is inside */}
        <section className="py-20 md:py-24 bg-[#141413] border-y border-[#353532]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl font-semibold text-white max-w-xl">What you can practice</h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 border-t border-[#353532]">
              {MODULES.map((m, i) => (
                <Link
                  key={m.title}
                  to={m.to}
                  className={`group block py-8 border-b border-[#353532] ${i % 2 === 0 ? 'md:pr-10 md:border-r' : 'md:pl-10'}`}
                >
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {m.title}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand-400 transition-colors" />
                  </h3>
                  <p className="mt-2 text-sm text-[#A8A8A2] leading-relaxed max-w-md">{m.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Roles from the database */}
        <section className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold text-white">Roles you can prepare for</h2>
                <p className="mt-3 text-[#A8A8A2]">Each role lists the skills it is tested on and the companies that hire for it.</p>
              </div>
              <Link to="/roles" className="text-sm font-medium text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
                All roles <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <ul className="mt-10 border-t border-[#353532]">
              {(roleList || []).slice(0, 5).map((role) => (
                <li key={role.id}>
                  <Link
                    to={`/roles/${role.slug}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-x-8 gap-y-1 py-5 border-b border-[#353532] hover:bg-[#141413] transition-colors px-2 -mx-2 rounded-sm"
                  >
                    <span className="text-[15px] font-medium text-gray-100">{role.title}</span>
                    <span className="hidden md:block text-sm text-[#A8A8A2] truncate">{role.topSkills.slice(0, 4).join(', ')}</span>
                    <span className="text-sm text-gray-400 sm:text-right">
                      {role.difficulty}
                      {role.hiringCompanies.length > 0 && ` · ${role.hiringCompanies.length} companies`}
                    </span>
                  </Link>
                </li>
              ))}
              {!roleList && (
                <li className="py-5 border-b border-[#353532] text-sm text-gray-400">Roles could not be loaded. Check that the API is running.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Closing */}
        <section className="py-20 md:py-24 border-t border-[#353532]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:items-end">
            <div className="md:col-span-8">
              <h2 className="text-3xl sm:text-4xl font-semibold text-white">Make your mistakes here, not in the real round.</h2>
              <p className="mt-4 text-[#A8A8A2] max-w-xl leading-relaxed">
                One mock interview and one aptitude test are enough to show which topics to work on next.
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 md:justify-end">
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full">Create an account</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg" className="w-full">Sign in</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
