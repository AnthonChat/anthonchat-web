import { ReactNode } from 'react';
import GlobalControls from '@/components/features/ui-controls/GlobalControls';

interface MarketingLayoutProps {
  children: ReactNode;
}

/**
 * Marketing layout that provides consistent global controls across all marketing pages.
 * Includes language and theme switching positioned as floating controls.
 */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <>
      {/* Global Controls - Language and Theme switching for all marketing pages */}
      <div className="fixed top-4 right-4 z-50">
        <GlobalControls variant="floating" />
      </div>
      {children}
    </>
  );
}