export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type Scope = 'org' | 'workspace' | 'board';

export const ROLE_WEIGHT: Record<Role, number> = {
    OWNER: 40,
    ADMIN: 30,
    MEMBER: 20,
    VIEWER: 10,
};

export function hasRoleOrAbove(userRole: Role, min: Role) {
    return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[min];
}