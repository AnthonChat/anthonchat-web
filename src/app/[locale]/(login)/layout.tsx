import { ReactNode } from 'react'
import GlobalControls from '@/components/features/ui-controls/GlobalControls'

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
      <GlobalControls variant="floating" position="top-right" themeVariant="cycle" />
    </div>
  )
}