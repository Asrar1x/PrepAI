import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appendTranscriptTurn,
  createInterview,
  endInterview,
  getInterviewHistory,
  getInterviewSession,
  getInterviewSetup,
  reconnectInterview,
} from './api';
import type { CreateInterviewInput, TranscriptTurn } from './types';

const keys = {
  setup: ['interviews', 'setup'] as const,
  session: (id: string) => ['interviews', 'session', id] as const,
  history: ['interviews', 'history'] as const,
};

export function useInterviewSetup() {
  return useQuery({ queryKey: keys.setup, queryFn: getInterviewSetup, staleTime: 60_000 });
}

export function useInterviewSession(id: string) {
  return useQuery({ queryKey: keys.session(id), queryFn: () => getInterviewSession(id), staleTime: 15_000 });
}

export function useInterviewHistory() {
  return useQuery({ queryKey: keys.history, queryFn: getInterviewHistory, staleTime: 30_000 });
}

export function useCreateInterview() {
  return useMutation({ mutationFn: (input: CreateInterviewInput) => createInterview(input) });
}

export function useReconnectInterview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reconnectInterview(id),
    onSuccess: (session) => queryClient.setQueryData(keys.session(id), session),
  });
}

export function useAppendTranscript(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (turn: TranscriptTurn) => appendTranscriptTurn(id, turn),
    onSuccess: (session) => queryClient.setQueryData(keys.session(id), session),
  });
}

export function useEndInterview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => endInterview(id),
    onSuccess: (session) => queryClient.setQueryData(keys.session(id), session),
  });
}
