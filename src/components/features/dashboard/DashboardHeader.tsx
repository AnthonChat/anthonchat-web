"use client";

import React from "react";
import { LocaleLink } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DashboardHeaderProps {
  title?: string;
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
  backLabel,
  icon,
  actions,
  variant = "default",
  className,
}: DashboardHeaderProps) {
  const isEnhanced = variant === "enhanced";
  const t = useTranslations("dashboard");

  const resolvedBackLabel = backLabel ?? t("header.backToDashboard");
  const resolvedTitle = title ?? t("header.greeting");
  const resolvedDescription = description ?? t("header.subtitle");

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
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0">
            {backHref && (
              <LocaleLink href={backHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("whitespace-nowrap", isEnhanced && "hover-lift group")}
                >
                  <ArrowLeft
                    className={cn(
                      "h-4 w-4 mr-0 sm:mr-2",
                      isEnhanced &&
                        "group-hover:-translate-x-1 transition-transform"
                    )}
                  />
                  <span className="hidden sm:inline">{resolvedBackLabel}</span>
                </Button>
              </LocaleLink>
            )}

            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  {icon}
                </div>
              )}
              <div className={cn(isEnhanced && "animate-fade-in")}>
                <h1
                  className={cn(
                    "font-bold text-foreground leading-tight truncate",
                    isEnhanced
                      ? "text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                      : "text-2xl"
                  )}
                >
                  {resolvedTitle}
                </h1>
                {resolvedDescription && (
                  <p
                    className={cn(
                      "text-muted-foreground break-words",
                      isEnhanced ? "text-sm font-medium" : "text-sm"
                    )}
                  >
                    {resolvedDescription}
                  </p>
                )}
              </div>
            </div>
          </div>

          {actions && (
            <div
              className={cn(
                "w-full sm:w-auto flex items-center gap-3 sm:gap-4 justify-end sm:justify-start",
                isEnhanced && "animate-fade-in"
              )}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
