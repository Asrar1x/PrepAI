import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address.');
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Password is too long.');

export const requiredText = (label: string, minimum = 1) =>
  z.string().trim().min(minimum, `${label} is required.`);
