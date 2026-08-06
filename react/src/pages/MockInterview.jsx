import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles, MessageSquare, PhoneOff } from 'lucide-react';

export default function MockInterview() {
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  if (!inCall) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 text-teal-600 mb-4">
            <Mic size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">AI Mock Interview</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Face-to-face real-time voice conversation with our intelligent AI interviewer. Get tested on technical, HR, or resume-based questions.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Interview Setup</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Interview Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button className="py-3 px-4 rounded-xl border-2 border-teal-500 bg-teal-50 text-teal-700 font-bold">Technical Round</button>
                <button className="py-3 px-4 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold hover:border-slate-300">HR Round</button>
                <button className="py-3 px-4 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold hover:border-slate-300">Combined</button>
                <button className="py-3 px-4 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold hover:border-slate-300">Resume Based</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Interviewer Persona</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 font-medium">
                  <option>Technical Lead (Direct)</option>
                  <option>HR Manager (Warm)</option>
                  <option>Startup Founder (Casual)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Difficulty</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 font-medium">
                  <option>Medium (Standard)</option>
                  <option>Easy (Beginner)</option>
                  <option>Hard (Advanced)</option>
                </select>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 flex gap-3 items-start">
              <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-800 font-medium">
                The AI will use your microphone for real-time speech-to-text. Ensure you are in a quiet environment before starting.
              </p>
            </div>

            <button 
              onClick={() => setInCall(true)}
              className="w-full bg-teal-600 text-white font-bold text-xl py-4 rounded-xl hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
            >
              Join Interview Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col pt-16">
      {/* Call Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-slate-900 absolute top-0 left-0 right-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-white font-medium">Recording Session...</span>
        </div>
        <div className="text-slate-300 font-mono text-xl">14:02</div>
        <div>
          <button className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Call Area */}
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Interviewer View (AI avatar) */}
        <div className="flex-1 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative flex flex-col items-center justify-center shadow-2xl">
          {/* Pulsing Avatar Effect that triggers when AI speaks */}
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500 rounded-full opacity-20 blur-xl animate-ping"></div>
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 border-4 border-slate-700 shadow-xl flex items-center justify-center relative z-10">
              <Sparkles size={64} className="text-white opacity-90" />
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 text-center">
            <div className="inline-block bg-slate-900/80 backdrop-blur px-6 py-3 rounded-full text-white">
              <p className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                "Can you explain the difference between a process and a thread?"
              </p>
            </div>
          </div>
          <span className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur px-3 py-1 rounded-lg text-slate-300 text-sm font-medium">
            Sanjana (AI Technical Lead)
          </span>
        </div>

        {/* Student View (Self) & Transcript */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4">
          <div className="h-48 md:h-64 rounded-2xl bg-black border border-slate-700 overflow-hidden relative shadow-lg">
            {!videoOn ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <VideoOff size={32} className="mb-2" />
                <span>Camera Off</span>
              </div>
            ) : (
               <div className="h-full bg-slate-800 flex items-center justify-center relative">
                 {/* Mock Webcam View */}
                 <img src="https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=256&auto=format&fit=crop" alt="User webcam" className="w-full h-full object-cover opacity-80" />
               </div>
            )}
            <span className="absolute bottom-3 left-3 bg-slate-900/60 backdrop-blur px-2 py-1 rounded text-slate-300 text-xs font-medium">
              You (Student)
            </span>
            {!micOn && (
               <div className="absolute top-3 right-3 bg-red-500/80 backdrop-blur p-1.5 rounded text-white shadow-xl">
                 <MicOff size={16} />
               </div>
            )}
          </div>

          {/* Live Transcript / Feedback */}
          <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col shadow-lg">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Live Transcript
            </h4>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-teal-400 text-xs font-bold block mb-1">AI Interviewer</span>
                <p className="text-slate-200 text-sm">Hello! Let's get started. Could you briefly introduce yourself and tell me why you're interested in the SDE role here?</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-3">
                <span className="text-blue-400 text-xs font-bold block mb-1">You</span>
                <p className="text-slate-200 text-sm">Sure, my name is Mohan. I am currently studying Computer Science and I love building full-stack applications with React and Node.js.</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-teal-900/30 border border-teal-800/50 flex items-start gap-3">
              <div className="typing-indicator mt-2 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce delay-150"></div>
              </div>
              <p className="text-teal-300 text-sm italic">AI is evaluating your response...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="h-24 bg-slate-900 flex items-center justify-center gap-6 pb-6">
        <button 
          onClick={() => setMicOn(!micOn)} 
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition ${micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
        >
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        
        <button 
          onClick={() => setInCall(false)}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition hover:scale-105"
        >
          <PhoneOff size={28} />
        </button>

        <button 
          onClick={() => setVideoOn(!videoOn)} 
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition ${videoOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
        >
          {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
      </div>

    </div>
  );
}
