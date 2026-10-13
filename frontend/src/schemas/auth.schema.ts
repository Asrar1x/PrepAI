import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid academic or professional email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['student', 'admin']),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid college or work email'),
  password: z.string().min(8, 'Password must contain at least 8 characters with letters & numbers'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  collegeName: z.string().min(2, 'College name is required'),
  branch: z.string().min(2, 'Department / Branch is required'),
  graduationYear: z.number().min(2020, 'Graduation year must be 2020 or later').max(2035, 'Graduation year must be 2035 or earlier'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter your registered email to receive an OTP/reset link'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter the email address you requested the code for'),
  otp: z.string().min(4, 'Enter the 4 to 6 digit verification code'),
  password: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm the new password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
