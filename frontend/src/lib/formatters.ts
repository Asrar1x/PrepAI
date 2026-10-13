import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { GradeType } from '../types/report';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd MMM yyyy, h:mm a');
  } catch {
    return String(dateInput);
  }
}

export function formatDateShort(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd MMM yyyy');
  } catch {
    return String(dateInput);
  }
}

export function formatTimeAgo(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function scoreToGrade(score: number): GradeType {
  if (score >= 90) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

export function getGradeBadgeClass(grade: GradeType): string {
  switch (grade) {
    case 'A+':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'A':
      return 'bg-brand-500/20 text-brand-400 border-brand-500/40';
    case 'B':
      return 'bg-brand-500/20 text-brand-400 border-brand-500/40';
    case 'C':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'D':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  }
}
