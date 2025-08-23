import { ReactNode } from 'react';

interface MarketingLayoutProps {
  children: ReactNode;
}

/**
 * Marketing layout for marketing pages.
 * Global accessibility controls are now handled by the root layout.
 */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}