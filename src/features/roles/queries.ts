import { useQuery } from '@tanstack/react-query';
import { getRole, listRoles } from './api';
import type { RoleListFilters } from './types';

export const roleKeys = {
  all: ['roles'] as const,
  list: (filters: RoleListFilters) => [...roleKeys.all, 'list', filters] as const,
  detail: (slug: string) => [...roleKeys.all, 'detail', slug] as const,
};

export function useRoles(filters: RoleListFilters = {}) {
  return useQuery({ queryKey: roleKeys.list(filters), queryFn: () => listRoles(filters) });
}

export function useRole(slug: string) {
  return useQuery({ queryKey: roleKeys.detail(slug), queryFn: () => getRole(slug), enabled: Boolean(slug) });
}
