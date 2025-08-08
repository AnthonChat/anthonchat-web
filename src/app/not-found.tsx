'use client'
 
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getPathWithLocale, isSupportedLocale, defaultLocale, type Locale } from '@/i18n/routing'

function LocaleHomeLink() {
  const locale = useLocale();
  const resolvedLocale: Locale = isSupportedLocale((locale ?? '') as string) ? ((locale as unknown) as Locale) : defaultLocale;
  const href = getPathWithLocale('/', resolvedLocale);
  return (
    <Link href={href} className="flex items-center justify-center">
      <Home className="h-4 w-4 mr-2" />
      Go Home
    </Link>
  );
}
export default function NotFound() {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    const checkEnglishRoute = async () => {
      // Don't redirect if already has locale prefix
      if (pathname.startsWith('/en/') || pathname.startsWith('/it/')) {
        setIsChecking(false)
        return
      }

      // Don't redirect for root path (already handled by src/app/page.tsx)
      if (pathname === '/') {
        setIsChecking(false)
        return
      }

      try {
        // Check if /en + current path exists (use routing helper to avoid hard-coded prefix)
        const englishPath = getPathWithLocale(pathname, 'en')
        const response = await fetch(englishPath, { method: 'HEAD' })
        
        if (response.ok) {
          setShouldRedirect(true)
          // Use window.location for immediate redirect to avoid hydration issues
          window.location.href = englishPath
          return
        }
      } catch (error) {
        console.info('Route check failed:', error)
      }

      setIsChecking(false)
    }

    checkEnglishRoute()
  }, [pathname])

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking route...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show redirect message (brief moment before redirect)
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Redirecting to English version...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show 404 page
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 p-4 bg-muted rounded-full w-fit">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404 - Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you&apos;re looking for doesn&apos;t exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <p className="font-medium mb-2">Requested path:</p>
            <code className="text-xs bg-background px-2 py-1 rounded border">
              {pathname}
            </code>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>This could happen if:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-left max-w-sm mx-auto">
              <li>The page was moved or deleted</li>
              <li>You typed the URL incorrectly</li>
              <li>The link you followed is broken</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <LocaleHomeLink />
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support at{' '}
              <a 
                href="mailto:anthon.chat@gmail.com" 
                className="text-primary hover:underline"
              >
                anthon.chat@gmail.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}