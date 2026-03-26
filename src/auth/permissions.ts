import { UserRole } from '@/src/domain/entities/user.entity';

export const PERMISSIONS = {
  PLAN_CREATE: 'plan:create',
  PLAN_READ: 'plan:read',
  PLAN_UPDATE: 'plan:update',
  PLAN_DELETE: 'plan:delete',
  PLAN_APPROVE: 'plan:approve',
  DOSIFICACAO_CREATE: 'dosificacao:create',
  DOSIFICACAO_READ: 'dosificacao:read',
  DOSIFICACAO_UPDATE: 'dosificacao:update',
  DOSIFICACAO_DELETE: 'dosificacao:delete',
  USER_MANAGE: 'user:manage',
} as const;

type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TEACHER]: [
    PERMISSIONS.PLAN_CREATE,
    PERMISSIONS.PLAN_READ,
    PERMISSIONS.PLAN_UPDATE,
    PERMISSIONS.DOSIFICACAO_CREATE,
    PERMISSIONS.DOSIFICACAO_READ,
    PERMISSIONS.DOSIFICACAO_UPDATE,
  ],
  [UserRole.COORDINATOR]: [
    PERMISSIONS.PLAN_CREATE,
    PERMISSIONS.PLAN_READ,
    PERMISSIONS.PLAN_UPDATE,
    PERMISSIONS.PLAN_DELETE,
    PERMISSIONS.PLAN_APPROVE,
    PERMISSIONS.DOSIFICACAO_CREATE,
    PERMISSIONS.DOSIFICACAO_READ,
    PERMISSIONS.DOSIFICACAO_UPDATE,
    PERMISSIONS.DOSIFICACAO_DELETE,
  ],
  [UserRole.ADMIN]: Object.values(PERMISSIONS),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role ${role} does not have permission: ${permission}`);
  }
}
