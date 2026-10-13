import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { useInterviewStore } from '../store/interviewStore';

describe('Zustand State Stores', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useInterviewStore.getState().resetInterview();
  });

  describe('authStore', () => {
    it('initializes with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('sets authentication credentials and updates state', () => {
      const mockUser = {
        id: 'test-user-1',
        name: 'Alex Mercer',
        email: 'alex@college.edu',
        role: 'student' as const,
        collegeName: 'NIT',
        branch: 'CSE',
        graduationYear: 2026,
        streakCount: 5,
        xpPoints: 1200,
        level: 3,
        readinessScore: 78,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
      };

      useAuthStore.getState().setAuth(mockUser, 'mock-token', 'mock-refresh-token');

      const updated = useAuthStore.getState();
      expect(updated.isAuthenticated).toBe(true);
      expect(updated.user?.name).toBe('Alex Mercer');
      expect(updated.token).toBe('mock-token');
    });

    it('clears state on logout', () => {
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('interviewStore', () => {
    it('initializes default interview session settings', () => {
      const state = useInterviewStore.getState();
      expect(state.session).toBeNull();
      expect(state.isAISpeaking).toBe(false);
      expect(state.avatarState).toBe('idle');
      expect(state.connectionStatus).toBe('idle');
    });

    it('updates AI speaking and listening states', () => {
      useInterviewStore.getState().setAvatarState('speaking');
      useInterviewStore.getState().setIsAISpeaking(true);
      expect(useInterviewStore.getState().avatarState).toBe('speaking');
      expect(useInterviewStore.getState().isAISpeaking).toBe(true);

      useInterviewStore.getState().setAvatarState('listening');
      useInterviewStore.getState().setIsStudentSpeaking(true);
      expect(useInterviewStore.getState().avatarState).toBe('listening');
      expect(useInterviewStore.getState().isStudentSpeaking).toBe(true);
    });

    it('initializes and manages interview session with transcripts', () => {
      useInterviewStore.getState().initSession({
        jobRole: 'Software Development Engineer',
        companyTarget: 'Amazon',
        interviewType: 'Technical Round',
        persona: 'Technical Lead'
      }, 'test-session-123');

      expect(useInterviewStore.getState().session?.sessionId).toBe('test-session-123');
      expect(useInterviewStore.getState().session?.companyTarget).toBe('Amazon');

      useInterviewStore.getState().addTranscriptMessage({
        speaker: 'ai',
        text: 'Explain how distributed locking works with Redis Redlock.'
      });

      const messages = useInterviewStore.getState().session?.transcript;
      expect(messages?.length).toBe(1);
      expect(messages?.[0].text).toContain('distributed locking');
      expect(messages?.[0].speaker).toBe('ai');
    });
  });
});
