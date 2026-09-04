import { roles } from './data';
import type { Role, RoleListFilters } from './types';

export class RoleApiError extends Error {
  readonly code: string;

  constructor(message: string, code = 'ROLE_REQUEST_FAILED') {
    super(message);
    this.name = 'RoleApiError';
    this.code = code;
  }
}

const wait = (milliseconds = 320) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function demoFailureRequested() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'error';
}

export async function listRoles(filters: RoleListFilters = {}): Promise<Role[]> {
  await wait();
  if (demoFailureRequested()) throw new RoleApiError('Role intelligence is temporarily unavailable.');

  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return roles.filter((role) => {
    const matchesCategory = !filters.category || filters.category === 'All' || role.category === filters.category;
    const searchable = [role.title, role.category, role.description, ...role.skills].join(' ').toLocaleLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });
}

export async function getRole(slug: string): Promise<Role | null> {
  await wait(220);
  if (demoFailureRequested()) throw new RoleApiError('Role detail could not be loaded.');
  return roles.find((role) => role.slug === slug) ?? null;
}
