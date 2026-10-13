import { MutationCache, QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../api/client';

export const queryClient: QueryClient = new QueryClient({
  // A failed action must never be silent: mutations without their own onError still show a message
  mutationCache: new MutationCache({
    // Any completed action can change XP, streak or level shown in the sidebar
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['me'] }); },
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.onError) toast.error(getFriendlyErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    }
  },
});
