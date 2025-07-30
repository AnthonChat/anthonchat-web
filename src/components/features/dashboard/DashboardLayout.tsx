import React from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  variant?: "default" | "enhanced";
  className?: string;
}

export function DashboardLayout({
  children,
  variant = "default",
  className,
}: DashboardLayoutProps) {
  const isEnhanced = variant === "enhanced";

  return (
    <div
      className={cn(
        "min-h-screen",
        isEnhanced
          ? "bg-gradient-to-br from-background via-muted/50 to-background"
          : "bg-muted",
        className
      )}
    >
      {children}
    </div>
  );
}