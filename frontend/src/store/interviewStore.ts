import { create } from 'zustand';
import { 
  InterviewSession, 
  TranscriptMessage, 
  ConnectionStatus, 
  AvatarState, 
  InterviewConfig 
} from '../types/interview';
import { INTERVIEW_PHASES } from '../lib/constants';

interface InterviewStore {
  session: InterviewSession | null;
  connectionStatus: ConnectionStatus;
  avatarState: AvatarState;
  isAISpeaking: boolean;
  isStudentSpeaking: boolean;
  isMicMuted: boolean;
  hasMicPermission: boolean;
  micPermissionError: string | null;
  partialTranscript: string;
  isBargeInActive: boolean;
  elapsedSeconds: number;
  timerIntervalId: number | null;

  initSession: (config: InterviewConfig, sessionId?: string, initialTranscript?: TranscriptMessage[], resumeContext?: any) => void;
  setFullSession: (session: InterviewSession) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAvatarState: (state: AvatarState) => void;
  setIsAISpeaking: (speaking: boolean) => void;
  setIsStudentSpeaking: (speaking: boolean) => void;
  toggleMicMute: () => void;
  setMicMuted: (muted: boolean) => void;
  setMicPermission: (granted: boolean, error?: string | null) => void;
  addTranscriptMessage: (msg: Omit<TranscriptMessage, 'id' | 'timestamp'>) => void;
  updateLastTranscriptMessage: (text: string) => void;
  setPartialTranscript: (text: string) => void;
  setPhase: (phaseIndex: number) => void;
  triggerBargeIn: () => void;
  incrementTimer: () => void;
  resetInterview: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  session: null,
  connectionStatus: 'idle',
  avatarState: 'idle',
  isAISpeaking: false,
  isStudentSpeaking: false,
  isMicMuted: true,
  hasMicPermission: false,
  micPermissionError: null,
  partialTranscript: '',
  isBargeInActive: false,
  elapsedSeconds: 0,
  timerIntervalId: null,

  initSession: (config, customSessionId, initialTranscript = [], resumeContext = null) => {
    const sessionId = customSessionId || `session-${Date.now().toString(36)}`;
    const newSession: InterviewSession = {
      sessionId,
      jobRole: config.jobRole,
      companyTarget: config.companyTarget,
      interviewType: config.interviewType,
      persona: config.persona,
      status: 'active',
      durationSeconds: 0,
      currentQuestionNumber: 1,
      totalQuestionsPlanned: 7,
      currentPhase: INTERVIEW_PHASES[0],
      currentPhaseIndex: 0,
      transcript: initialTranscript,
      resumeContext,
      startedAt: new Date().toISOString()
    };

    set({
      session: newSession,
      connectionStatus: 'connecting',
      avatarState: 'connecting',
      isMicMuted: true,
      elapsedSeconds: 0,
      partialTranscript: '',
      isBargeInActive: false
    });
  },

  setFullSession: (fullSession) => {
    set({
      session: fullSession,
      connectionStatus: 'connected',
      avatarState: 'listening'
    });
  },

  setConnectionStatus: (status) => {
    let nextAvatar: AvatarState = 'idle';
    if (status === 'connecting' || status === 'reconnecting') nextAvatar = 'connecting';
    else if (status === 'disconnected') nextAvatar = 'disconnected';
    else if (status === 'connected') nextAvatar = 'listening';

    set({ connectionStatus: status, avatarState: nextAvatar });
  },

  setAvatarState: (avatarState) => set({ avatarState }),

  setIsAISpeaking: (isAISpeaking) => {
    set((state) => ({
      isAISpeaking,
      avatarState: isAISpeaking ? 'speaking' : state.isStudentSpeaking ? 'listening' : 'idle'
    }));
  },

  setIsStudentSpeaking: (isStudentSpeaking) => {
    set((state) => ({
      isStudentSpeaking,
      avatarState: isStudentSpeaking ? 'listening' : state.isAISpeaking ? 'speaking' : 'idle'
    }));
  },

  toggleMicMute: () => set((state) => {
    const nextMuted = !state.isMicMuted;
    return {
      isMicMuted: nextMuted,
      partialTranscript: nextMuted ? '' : state.partialTranscript,
      isStudentSpeaking: nextMuted ? false : state.isStudentSpeaking
    };
  }),
  setMicMuted: (isMicMuted) => set({
    isMicMuted,
    partialTranscript: isMicMuted ? '' : undefined,
    isStudentSpeaking: isMicMuted ? false : undefined
  }),

  setMicPermission: (hasMicPermission, micPermissionError = null) => {
    set({ hasMicPermission, micPermissionError });
  },

  addTranscriptMessage: (msg) => {
    const newMessage: TranscriptMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speaker: msg.speaker,
      text: msg.text,
      timestamp: new Date().toISOString()
    };

    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          transcript: [...state.session.transcript, newMessage]
        },
        partialTranscript: msg.speaker === 'student' ? '' : state.partialTranscript
      };
    });
  },

  updateLastTranscriptMessage: (text) => {
    set((state) => {
      if (!state.session || state.session.transcript.length === 0) return state;
      const lastIndex = state.session.transcript.length - 1;
      const updatedTranscript = [...state.session.transcript];
      updatedTranscript[lastIndex] = {
        ...updatedTranscript[lastIndex],
        text
      };
      return {
        session: {
          ...state.session,
          transcript: updatedTranscript
        }
      };
    });
  },

  setPartialTranscript: (partialTranscript) => set({ partialTranscript }),

  setPhase: (phaseIndex) => {
    const phaseName = INTERVIEW_PHASES[phaseIndex] || INTERVIEW_PHASES[INTERVIEW_PHASES.length - 1];
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          currentPhase: phaseName,
          currentPhaseIndex: phaseIndex,
          currentQuestionNumber: Math.min(phaseIndex + 1, state.session.totalQuestionsPlanned)
        }
      };
    });
  },

  triggerBargeIn: () => {
    set({
      isBargeInActive: true,
      isAISpeaking: false,
      avatarState: 'listening'
    });
  },

  incrementTimer: () => {
    set((state) => {
      const nextSeconds = state.elapsedSeconds + 1;
      return {
        elapsedSeconds: nextSeconds,
        session: state.session ? { ...state.session, durationSeconds: nextSeconds } : null
      };
    });
  },

  resetInterview: () => {
    set({
      session: null,
      connectionStatus: 'idle',
      avatarState: 'idle',
      isAISpeaking: false,
      isStudentSpeaking: false,
      isMicMuted: true,
      partialTranscript: '',
      isBargeInActive: false,
      elapsedSeconds: 0
    });
  }
}));
