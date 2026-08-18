import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle, Trophy, BarChart } from 'lucide-react';

export default function AptitudeTest() {
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const mockQuestions = [
    {
      type: "Quantitative",
      text: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
      options: ["120 metres", "180 metres", "150 metres", "160 metres"],
      answer: 2
    },
    {
      type: "Logical Reasoning",
      text: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
      options: ["(1/3)", "(1/8)", "(2/8)", "(1/16)"],
      answer: 1
    }
  ];

  if (!testStarted) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
            <Trophy size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Dynamic Aptitude Engine</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Simulate actual company test patterns. AI adjusts the difficulty dynamically and provides step-by-step explanations for mistakes.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center md:text-left">
          <div className="grid md:grid-cols-2">
            <div className="p-8 lg:p-12 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Configure Your Test</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Company Pattern</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                      <option>TCS NQT (Aptitude + Coding)</option>
                      <option>Infosys (Online Test)</option>
                      <option>Wipro NLTH</option>
                      <option>Zoho Round 1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Role</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                      <option>Software Developer (SDE)</option>
                      <option>Data Analyst</option>
                      <option>Product Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                    <div className="flex gap-4">
                      {['30 Min', '60 Min', '90 Min'].map(t => (
                        <button key={t} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:border-indigo-500 hover:text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-colors">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setTestStarted(true)}
                className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                <PlayCircle />
                Start Simulation
              </button>
            </div>
            
            <div className="bg-slate-50 p-8 lg:p-12 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart className="text-indigo-600" />
                Performance Metrics
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Adaptive Difficulty</p>
                    <p className="text-sm text-slate-600">3 correct answers increase difficulty level. 2 wrong decrease it.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Company Timers</p>
                    <p className="text-sm text-slate-600">Sectional time limits matched perfectly to your target company.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="text-rose-500 mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Negative Marking</p>
                    <p className="text-sm text-slate-600">Applied dynamically based on actual company rules.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in up">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">{mockQuestions[currentQuestion].type}</span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Question {currentQuestion + 1} of {mockQuestions.length}</h2>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg font-mono font-bold text-lg">
          <Clock size={20} />
          29:45
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <p className="text-lg text-slate-800 font-medium leading-relaxed mb-8">
          {mockQuestions[currentQuestion].text}
        </p>

        <div className="space-y-3">
          {mockQuestions[currentQuestion].options.map((opt, i) => (
            <button key={i} className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 font-medium text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-bold mr-4">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={() => setCurrentQuestion(prev => Math.min(prev + 1, mockQuestions.length - 1))}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
        >
          {currentQuestion === mockQuestions.length - 1 ? 'Submit Test' : 'Save & Next'}
        </button>
      </div>
    </div>
  );
}
