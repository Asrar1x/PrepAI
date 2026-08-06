import React from 'react';
import { Download, Share2, Check, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';

export default function FeedbackReport() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Interview Analysis Report</h1>
          <p className="text-slate-500 font-medium mt-1">Session on Aug 06, 2026 • Technical Round (SDE)</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition">
            <Share2 size={18} /> Share
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md shadow-blue-200">
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
          
          <h3 className="text-indigo-200 font-medium uppercase tracking-wider text-sm mb-4">Overall Grade</h3>
          <div className="text-7xl font-black mb-2 tracking-tighter">86<span className="text-3xl text-indigo-400">%</span></div>
          <p className="text-emerald-400 font-bold text-xl mb-6">A - Strong Candidate</p>
          
          <div className="space-y-4 text-sm font-medium border-t border-indigo-700/50 pt-6 text-left">
            <div className="flex justify-between">
              <span className="text-indigo-200">Technical Knowledge</span>
              <span className="text-white">92%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-200">Communication</span>
              <span className="text-white">84%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-200">Confidence</span>
              <span className="text-white">78%</span>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart2 className="text-blue-500" /> Executive Summary
            </h3>
            <p className="text-slate-700 leading-relaxed">
              You performed well in this technical interview. Your explanation of Database Indexing and Big O notation was clear and accurate. However, you struggled slightly when asked to scale a system under heavy load, indicating a gap in distributed systems knowledge.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-2">
                <Check size={18} /> Top Strengths
              </h4>
              <ul className="text-sm text-emerald-700 space-y-1 ml-6 list-disc">
                <li>Strong core algorithm knowledge</li>
                <li>Clear articulation of thought process</li>
              </ul>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
                <AlertTriangle size={18} /> Areas for Improvement
              </h4>
              <ul className="text-sm text-rose-700 space-y-1 ml-6 list-disc">
                <li>System scaling concepts</li>
                <li>Used filler words ("uh") 14 times</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">Question-by-Question Analysis</h3>
        </div>
        <div className="p-6 space-y-8">
          {/* Q1 */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">Q1</span>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Can you explain what happens when you type a URL into a browser?</h4>
                <div className="mt-3 p-4 bg-blue-50 rounded-lg text-slate-700 text-sm italic border-l-4 border-blue-500">
                  "First, the browser checks the DNS cache to find the IP. If not found, it makes a DNS query. Then it establishes a TCP connection with the server, does a TLS handshake if it's HTTPS, and sends an HTTP GET request. The server replies with HTML, and the browser parses the DOM and renders it."
                </div>
              </div>
            </div>
            <div className="ml-12 p-4 bg-slate-50 rounded-lg border border-slate-200 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-sm">
                  <span className="text-emerald-700 font-bold">10/10</span>
                </div>
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm">AI Feedback</h5>
                <p className="text-slate-600 text-sm mt-1">Excellent answer. You covered all the critical components (DNS, TCP, TLS, HTTP, Rendering) sequentially without missing a step. This shows deep understanding of web fundamentals.</p>
              </div>
            </div>
          </div>
          
          <hr className="border-slate-100" />

          {/* Q2 */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">Q2</span>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">If our API is taking 5 seconds to respond, how would you diagnose the bottleneck?</h4>
                <div className="mt-3 p-4 bg-blue-50 rounded-lg text-slate-700 text-sm italic border-l-4 border-blue-500">
                  "Uh, I would check the code to see if there is an infinite loop. Then I'd look at the database to see if the query is slow, and maybe add an index."
                </div>
              </div>
            </div>
            <div className="ml-12 p-4 bg-slate-50 rounded-lg border border-slate-200 flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-4 border-white shadow-sm">
                  <span className="text-amber-700 font-bold">5/10</span>
                </div>
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm">AI Feedback</h5>
                <p className="text-slate-600 text-sm mt-1">This answer is too shallow for an SDE role. While checking DB queries is correct, you missed checking server monitoring/logs (APM tools), network latency, memory leaks, or third-party API dependencies. <strong>Tip: Use a structured approach like Top-Down (Client to Network to App Server to Database).</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
