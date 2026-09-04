import { create } from 'zustand';
import type { TranscriptTurn } from '@/shared/types';

export type MicrophonePermission = 'unknown' | 'requesting' | 'granted' | 'denied';
export type InterviewConnection = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

interface InterviewState {
  microphonePermission: MicrophonePermission;
  selectedDeviceId: string | null;
  connection: InterviewConnection;
  isMuted: boolean;
  isPushToTalk: boolean;
  transcript: TranscriptTurn[];
  setMicrophonePermission: (permission: MicrophonePermission) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setConnection: (connection: InterviewConnection) => void;
  setMuted: (isMuted: boolean) => void;
  setPushToTalk: (isPushToTalk: boolean) => void;
  appendTranscript: (turn: TranscriptTurn) => void;
  replacePartialTranscript: (turn: TranscriptTurn) => void;
  reset: () => void;
}

const initialState = {
  microphonePermission: 'unknown' as MicrophonePermission,
  selectedDeviceId: null,
  connection: 'idle' as InterviewConnection,
  isMuted: false,
  isPushToTalk: false,
  transcript: [],
};

export const useInterviewStore = create<InterviewState>((set) => ({
  ...initialState,
  setMicrophonePermission: (microphonePermission) => set({ microphonePermission }),
  setSelectedDeviceId: (selectedDeviceId) => set({ selectedDeviceId }),
  setConnection: (connection) => set({ connection }),
  setMuted: (isMuted) => set({ isMuted }),
  setPushToTalk: (isPushToTalk) => set({ isPushToTalk }),
  appendTranscript: (turn) => set((state) => ({ transcript: [...state.transcript.filter((item) => !item.isPartial), turn] })),
  replacePartialTranscript: (turn) => set((state) => ({ transcript: [...state.transcript.filter((item) => !item.isPartial), { ...turn, isPartial: true }] })),
  reset: () => set(initialState),
}));
