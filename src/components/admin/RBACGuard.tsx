"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Lock } from "lucide-react"
import { hasPermission, type AdminRole, type AdminPermission } from "@/lib/auth/rbac"

interface RBACGuardProps {
  children: React.ReactNode
  requiredPermission?: AdminPermission
  requiredPermissions?: AdminPermission[]
  requireAll?: boolean // true = AND, false = OR
  userRole?: AdminRole
  fallback?: React.ReactNode
  showMessage?: boolean
}

/**
 * RBAC Guard component that conditionally renders children based on user permissions
 */
export function RBACGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = true,
  userRole,
  fallback,
  showMessage = true,
}: RBACGuardProps) {
   // For now, assume admin role if not provided
   // In a real app, this would come from authentication context
   const currentRole: AdminRole = userRole ?? "admin"

  let hasAccess = false

  if (requiredPermission) {
    hasAccess = hasPermission(currentRole, requiredPermission)
  } else if (requiredPermissions) {
    if (requireAll) {
      hasAccess = requiredPermissions.every(permission => hasPermission(currentRole, permission))
    } else {
      hasAccess = requiredPermissions.some(permission => hasPermission(currentRole, permission))
    }
  } else {
    // No specific permission required
    hasAccess = true
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showMessage) {
    return null
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-destructive" />
          <CardTitle className="text-lg">Access Restricted</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm">
              You don&apos;t have permission to access this feature.
            </p>
            <p className="text-xs text-muted-foreground">
              Current role: {currentRole}
              {requiredPermission && ` | Permission: ${requiredPermission}`}
              {requiredPermissions && ` | Permissions: ${requiredPermissions.join(", ")}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Higher-order component for RBAC protection
 */
export function withRBAC<P extends object>(
  Component: React.ComponentType<P>,
  rbacProps: Omit<RBACGuardProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <RBACGuard {...rbacProps}>
      <Component {...props} />
    </RBACGuard>
  )

  WrappedComponent.displayName = `withRBAC(${Component.displayName || Component.name})`

  return WrappedComponent
}