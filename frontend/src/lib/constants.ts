export const APP_NAME = 'PrepAI';
export const APP_TAGLINE = 'Crack Your Placement Interview';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const IS_MOCK_MODE = import.meta.env.VITE_USE_MOCK_API === 'true';

export const TOKEN_STORAGE_KEY = 'prepai_auth_token';
export const USER_STORAGE_KEY = 'prepai_auth_user';
export const REFRESH_TOKEN_KEY = 'prepai_refresh_token';

export const COLORS = {
  bgPrimary: '#121211',
  bgSecondary: '#171716',
  bgElevated: '#1F1F1E',
  accentPrimary: '#4A76D9',
  accentSecondary: '#4A76D9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#374151',
  interviewer: '#1E293B',
  interviewStudent: '#29437F'
};

export const INTERVIEW_PHASES = [
  'Introduction',
  'Background Verification',
  'Core Questions',
  'Counter-Question Layer',
  'Situational / Behavioral',
  'Candidate Questions',
  'Wrap-Up'
] as const;

export const AI_INTERVIEWER_PERSONAS = [
  {
    id: 'Corporate HR',
    name: 'HR interviewer',
    roleTitle: 'Senior Talent Acquisition Lead',
    style: 'Calm and structured',
    description: 'Asks about teamwork, conflicts and past situations, and expects answers with a clear situation, action and result.',
    avatarSeed: 'Eleanor'
  },
  {
    id: 'Technical Lead',
    name: 'Technical lead',
    roleTitle: 'Principal Systems Architect',
    style: 'Direct, asks for detail',
    description: 'Asks how and why: design trade-offs, algorithms, databases and how you would make code faster.',
    avatarSeed: 'David'
  },
  {
    id: 'Startup Founder',
    name: 'Startup founder',
    roleTitle: 'Founder & Head of Product',
    style: 'Quick and broad',
    description: 'Asks what you built yourself, how fast you can ship, and what you would do when the requirements are unclear.',
    avatarSeed: 'Priya'
  },
  {
    id: 'Panel Interviewer',
    name: 'Hiring panel',
    roleTitle: 'Multi-Disciplinary Hiring Panel',
    style: 'Several people, more pressure',
    description: 'HR, technical and manager questions in one sitting, switching between them.',
    avatarSeed: 'Marcus'
  }
];

