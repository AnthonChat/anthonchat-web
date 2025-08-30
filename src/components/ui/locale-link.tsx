"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { getPathWithLocale, type Locale } from "@/i18n/routing";
import { ComponentProps } from "react";

interface LocaleLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  href: string;
}

/**
 * Locale-aware Link component that automatically prefixes paths with the current locale
 * 
 * @example
 * <LocaleLink href="/signup">Sign Up</LocaleLink>
 * // Renders as /en/signup or /it/signup based on current locale
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  
  // Don't modify external links or already locale-prefixed links
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return <Link href={href} {...props} />;
  }
  
  const localeAwareHref = getPathWithLocale(href, locale as Locale);
  
  return <Link href={localeAwareHref} {...props} />;
}