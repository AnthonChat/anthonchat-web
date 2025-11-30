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
 * 
 * @example
 * <LocaleLink href="/signup?redirectTo=/dashboard">Sign Up</LocaleLink>
 * // Renders as /en/signup?redirectTo=/dashboard
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  
  // Don't modify external links or already locale-prefixed links
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return <Link href={href} {...props} />;
  }
  
  // Separate path from query string and hash
  let pathname = href;
  let queryAndHash = '';
  
  const hashIndex = href.indexOf('#');
  const queryIndex = href.indexOf('?');
  
  if (hashIndex !== -1 && (queryIndex === -1 || hashIndex < queryIndex)) {
    pathname = href.substring(0, hashIndex);
    queryAndHash = href.substring(hashIndex);
  } else if (queryIndex !== -1) {
    pathname = href.substring(0, queryIndex);
    queryAndHash = href.substring(queryIndex);
  }
  
  const localeAwarePath = getPathWithLocale(pathname, locale as Locale);
  const localeAwareHref = localeAwarePath + queryAndHash;
  
  return <Link href={localeAwareHref} {...props} />;
}