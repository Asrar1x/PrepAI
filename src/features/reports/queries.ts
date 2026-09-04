import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getInterviewReport, getReportStatus, setReportSharing } from './api';

const keys = {
  status: (sessionId: string) => ['reports', 'status', sessionId] as const,
  detail: (sessionId: string) => ['reports', 'detail', sessionId] as const,
};

export function useReportStatus(sessionId: string) {
  return useQuery({
    queryKey: keys.status(sessionId),
    queryFn: () => getReportStatus(sessionId),
    refetchInterval: (query) => query.state.data?.state === 'processing' ? 3000 : false,
  });
}

export function useInterviewReport(sessionId: string) {
  return useQuery({ queryKey: keys.detail(sessionId), queryFn: () => getInterviewReport(sessionId), staleTime: 30_000 });
}

export function useReportSharing(sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (shared: boolean) => setReportSharing(sessionId, shared),
    onSuccess: (report) => client.setQueryData(keys.detail(sessionId), report),
  });
}
