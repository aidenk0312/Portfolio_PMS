import { SetMetadata } from '@nestjs/common';
import type { Role, Scope } from './roles';

export const SCOPE_ROLE_KEY = 'scope-role';

export interface ScopeRoleMeta {
    scope: Scope;
    minRole: Role;
}

export const ScopeRole = (scope: Scope, minRole: Role) =>
    SetMetadata(SCOPE_ROLE_KEY, { scope, minRole } as ScopeRoleMeta);
