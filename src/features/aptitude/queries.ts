import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  endAptitudeSession,
  getAptitudeReport,
  getNextQuestion,
  startAptitudeSession,
  submitAptitudeAnswer,
  type AptitudeStartPayload,
} from './api';

export const aptitudeKeys = {
  all: ['aptitude'] as const,
  report: (sessionId: string) => [...aptitudeKeys.all, 'report', sessionId] as const,
};

export function useStartAptitude() {
  return useMutation({
    mutationFn: (payload: AptitudeStartPayload) => startAptitudeSession(payload),
  });
}

export function useNextQuestion() {
  return useMutation({
    mutationFn: (sessionId: string) => getNextQuestion(sessionId),
  });
}

export function useSubmitAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: { question_id: string; selected_index: number; time_taken_seconds: number };
    }) => submitAptitudeAnswer(sessionId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: aptitudeKeys.report(vars.sessionId) });
    },
  });
}

export function useEndAptitude() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => endAptitudeSession(sessionId),
    onSuccess: (data) => {
      qc.setQueryData(aptitudeKeys.report(data.id), data);
    },
  });
}

export function useAptitudeReport(sessionId: string) {
  return useQuery({
    queryKey: aptitudeKeys.report(sessionId),
    queryFn: () => getAptitudeReport(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      const status = q.state.data?.total_questions;
      // poll lightly while questions are still being added
      return typeof status === 'number' ? false : 5000;
    },
  });
}
