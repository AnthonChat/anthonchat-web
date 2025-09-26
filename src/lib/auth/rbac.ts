/**
 * Role-Based Access Control (RBAC) utilities for admin features
 */

export type AdminRole = "admin" | "user";

export type AdminPermission =
  | "broadcast.send"
  | "broadcast.view"
  | "users.view"
  | "users.edit"
  | "users.delete"
  | "analytics.view"
  | "analytics.export"
  | "system.settings";

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  // Binary RBAC: admins have all permissions, non-admin users have none
  admin: [
    "broadcast.send",
    "broadcast.view",
    "users.view",
    "users.edit",
    "users.delete",
    "analytics.view",
    "analytics.export",
    "system.settings",
  ],
  user: [],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Check if a role can perform multiple permissions (AND condition)
 */
export function hasAllPermissions(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role can perform at least one of the permissions (OR condition)
 */
export function hasAnyPermission(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Get the role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: AdminRole): number {
  // Simplified levels for binary RBAC
  const levels: Record<AdminRole, number> = {
    user: 1,
    admin: 2,
  };
  return levels[role] ?? 0;
}

/**
 * Check if a role has at least the level of another role
 */
export function hasRoleLevel(role: AdminRole, minimumRole: AdminRole): boolean {
  return getRoleLevel(role) >= getRoleLevel(minimumRole);
}