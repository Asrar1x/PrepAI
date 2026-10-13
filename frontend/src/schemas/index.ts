import { z } from 'zod';

export const aptitudeConfigSchema = z.object({
  jobRole: z.string().min(1, 'Please select a job role'),
  companyPattern: z.string().optional(),
  durationMinutes: z.coerce.number().refine((val) => [30, 60, 90].includes(val), {
    message: 'Duration must be 30, 60, or 90 minutes',
  }),
});

export const interviewConfigSchema = z.object({
  jobRole: z.string().min(1, 'Please select a job role'),
  companyTarget: z.string().optional(),
  interviewType: z.enum([
    'HR Round',
    'Technical Round',
    'Combined Round',
    'Resume Based',
    'Case Study / PM Round',
  ]),
  persona: z.enum([
    'Corporate HR',
    'Technical Lead',
    'Startup Founder',
    'Panel Interviewer',
  ]),
});

export const driveActivationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  targetBatch: z.string().min(1, 'Target batch is required (e.g. 2026 Batch)'),
  durationDays: z.coerce.number().min(1).max(60),
  focusTopics: z.string().min(1, 'Enter key focus areas comma-separated'),
  mandatoryMockRounds: z.coerce.number().min(1).max(5),
});

export const interviewEventSchema = z.object({
  eventName: z.string().min(3, 'Event title is required'),
  scheduledDate: z.string().min(1, 'Event date is required'),
  scheduledTime: z.string().min(1, 'Event time is required'),
  roleTitle: z.string().min(1, 'Role title is required'),
  companyName: z.string().min(1, 'Company is required'),
  batchName: z.string().min(1, 'Target batch is required'),
});

export const bulletImprovementSchema = z.object({
  originalBullet: z.string().min(10, 'Provide at least one complete bullet point sentence'),
  targetRole: z.string().optional(),
});
