"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "default" | "enhanced";
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  backHref,
  backLabel = "Back to Dashboard",
  icon,
  actions,
  variant = "default",
  className,
}: DashboardHeaderProps) {
  const isEnhanced = variant === "enhanced";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b shadow-sm",
        isEnhanced
          ? "bg-card/80 backdrop-blur-lg border-border/50"
          : "bg-card border-border",
        className
      )}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link href={backHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    isEnhanced && "hover-lift group"
                  )}
                >
                  <ArrowLeft
                    className={cn(
                      "h-4 w-4 mr-2",
                      isEnhanced && "group-hover:-translate-x-1 transition-transform"
                    )}
                  />
                  {backLabel}
                </Button>
              </Link>
            )}
            
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  {icon}
                </div>
              )}
              <div className={cn(isEnhanced && "animate-fade-in")}>
                <h1
                  className={cn(
                    "font-bold text-foreground",
                    isEnhanced
                      ? "text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                      : "text-2xl"
                  )}
                >
                  {title}
                </h1>
                {description && (
                  <p
                    className={cn(
                      "text-muted-foreground",
                      isEnhanced ? "text-sm font-medium" : "text-sm"
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {actions && (
            <div className={cn("flex items-center gap-4", isEnhanced && "animate-fade-in")}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}