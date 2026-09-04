import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles, MessageSquare, PhoneOff, Send } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { useNavigate } from 'react-router-dom';

export default function MockInterview() {
  const navigate = useNavigate();
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startInterview = async () => {
    try {
      const res = await apiClient.post('/interview/start', {
        job_role: "Software Developer",
        interview_type: "technical"
      });
      const data = res.data?.data || res.data;
      setSessionId(data.session_id);
      setMessages([{ role: 'AI Interviewer', content: data.message }]);
      setInCall(true);
    } catch (err) {
      console.error(err);
      alert("Failed to start interview");
    }
  };

  const endInterview = async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/interview/${sessionId}/end`);
      await apiClient.put('/users/me/xp', { points: 50 });
      alert("Interview Ended! You earned 50 XP! Report is being generated.");
      setInCall(false);
      navigate(`/feedback/${sessionId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId) return;
    
    const userMsg = { role: 'You', content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    
    try {
      const res = await apiClient.post('/interview/chat', {
        session_id: sessionId,
        message: userMsg.content,
        history: messages
      });
      const data = res.data?.data || res.data;
      setMessages(prev => [...prev, { role: 'AI Interviewer', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'AI Interviewer', content: "Sorry, I had an error processing that." }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!inCall) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 text-teal-600 mb-4">
            <Mic size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">AI Mock Interview</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Interactive real-time conversation with our intelligent AI interviewer. Get tested on technical, HR, or resume-based questions.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Interview Setup</h3>
          
          <div className="space-y-6">
            <button 
              onClick={startInterview}
              className="w-full bg-teal-600 text-white font-bold text-xl py-4 rounded-xl hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
            >
              Start Interview
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
          <span className="text-white font-medium">Interview in Progress</span>
        </div>
        <div>
          <button className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Call Area */}
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* Interviewer View (AI avatar) */}
        <div className="hidden md:flex flex-1 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative flex-col items-center justify-center shadow-2xl">
          <div className="relative">
            <div className={`absolute inset-0 bg-teal-500 rounded-full opacity-20 blur-xl ${isTyping ? 'animate-ping' : ''}`}></div>
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 border-4 border-slate-700 shadow-xl flex items-center justify-center relative z-10">
              <Sparkles size={64} className="text-white opacity-90" />
            </div>
          </div>
          <span className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur px-3 py-1 rounded-lg text-slate-300 text-sm font-medium">
            AI Technical Lead
          </span>
        </div>

        {/* Live Transcript / Chat */}
        <div className="w-full md:w-96 flex flex-col gap-4">
          <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col shadow-lg">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Live Chat
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'You' ? "bg-blue-900/30 border border-blue-800/50 rounded-lg p-3" : "bg-slate-700/50 rounded-lg p-3"}>
                  <span className={m.role === 'You' ? "text-blue-400 text-xs font-bold block mb-1" : "text-teal-400 text-xs font-bold block mb-1"}>{m.role}</span>
                  <p className="text-slate-200 text-sm">{m.content}</p>
                </div>
              ))}
              
              {isTyping && (
                <div className="mt-4 p-3 rounded-lg bg-teal-900/30 border border-teal-800/50 flex items-start gap-3">
                  <div className="typing-indicator mt-2 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"></div>
                  </div>
                  <p className="text-teal-300 text-sm italic">AI is evaluating your response...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Box for text based fallback */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your answer..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  disabled={isTyping}
                />
                <button 
                  onClick={sendMessage}
                  disabled={isTyping || !inputText.trim()}
                  className="bg-teal-600 p-2 rounded-lg text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="h-24 bg-slate-900 flex items-center justify-center gap-6 pb-6">
        <button 
          onClick={endInterview}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition hover:scale-105"
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
}
