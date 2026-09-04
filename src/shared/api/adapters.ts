/**
 * Snake_case (backend) -> camelCase (frontend) adapters.
 *
 * The FastAPI backend uses snake_case keys. The frontend TypeScript
 * types use camelCase. This module is the single conversion point so
 * every API response flows through one well-tested transformer.
 */

import type { User } from '@/shared/types';

interface BackendUser {
  id: string;
  email: string;
  full_name?: string;
  fullName?: string;
  college_name?: string;
  collegeName?: string;
  branch?: string;
  graduation_year?: number;
  graduationYear?: number;
  role?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  target_roles?: string[];
  targetRoleSlugs?: string[];
  current_streak?: number;
  longest_streak?: number;
  total_xp?: number;
  created_at?: string;
}

const pick = <T,>(snake: T | undefined, camel: T | undefined, fallback: T): T => {
  if (snake !== undefined && snake !== null) return snake;
  if (camel !== undefined && camel !== null) return camel;
  return fallback;
};

export function adaptUser(raw: unknown): User {
  const u = (raw ?? {}) as BackendUser;
  return {
    id: String(u.id ?? ''),
    email: u.email ?? '',
    fullName: pick(u.full_name, u.fullName, ''),
    role: (u.role as User['role']) ?? 'student',
    collegeName: u.college_name ?? u.collegeName,
    branch: u.branch,
    graduationYear: u.graduation_year ?? u.graduationYear,
    avatarUrl: u.avatar_url ?? u.avatarUrl ?? null,
    targetRoleSlugs: u.target_roles ?? u.targetRoleSlugs ?? [],
  };
}

/**
 * Recursively transform a backend payload (snake_case) into camelCase keys
 * for shallow key renames. Used for endpoints that don't have a dedicated
 * adapter yet.
 */
export function snakeToCamel<T = unknown>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((v) => snakeToCamel(v)) as unknown as T;
  }
  if (input && typeof input === 'object' && input.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const camelKey = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
      out[camelKey] = snakeToCamel(v);
    }
    return out as T;
  }
  return input;
}
