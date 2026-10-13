import { describe, it, expect } from 'vitest';
import { formatDuration, scoreToGrade, formatDateTime, formatDateShort, formatTimeAgo, getGradeBadgeClass } from '../lib/formatters';

describe('Formatters Library', () => {
  describe('formatDuration', () => {
    it('formats seconds into mm:ss format correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(1420)).toBe('23:40');
    });
  });

  describe('scoreToGrade', () => {
    it('calculates proper grade based on score threshold', () => {
      expect(scoreToGrade(92)).toBe('A+');
      expect(scoreToGrade(84)).toBe('A');
      expect(scoreToGrade(75)).toBe('A');
      expect(scoreToGrade(68)).toBe('B');
      expect(scoreToGrade(45)).toBe('C');
      expect(scoreToGrade(30)).toBe('D');
    });
  });

  describe('getGradeBadgeClass', () => {
    it('returns proper styling class for grades', () => {
      expect(getGradeBadgeClass('A+')).toContain('emerald');
      expect(getGradeBadgeClass('A')).toContain('brand');
      expect(getGradeBadgeClass('D')).toContain('rose');
    });
  });

  describe('formatDateTime & formatDateShort', () => {
    it('safely formats date strings', () => {
      const dt = formatDateTime('2026-09-30T10:00:00Z');
      expect(dt).toBeDefined();
      expect(typeof dt).toBe('string');
      expect(dt.length).toBeGreaterThan(0);

      const short = formatDateShort('2026-09-30T10:00:00Z');
      expect(short).toBeDefined();
      expect(typeof short).toBe('string');
    });

    it('formats relative time ago', () => {
      const ago = formatTimeAgo(new Date().toISOString());
      expect(ago).toBeDefined();
      expect(typeof ago).toBe('string');
    });
  });
});
