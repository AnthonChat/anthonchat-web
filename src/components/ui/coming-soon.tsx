'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock } from "lucide-react"
import { useLocaleRouter } from "@/hooks/use-locale-router"
import { useEffect } from "react"

interface ComingSoonProps {
  title: string
  description?: string
  redirectPath?: string
  autoRedirectDelay?: number
}

export function ComingSoon({ 
  title, 
  description = "This feature is currently under development and will be available soon.",
  redirectPath = "/dashboard",
  autoRedirectDelay = 3000
}: ComingSoonProps) {
  const router = useLocaleRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(redirectPath)
    }, autoRedirectDelay)

    return () => clearTimeout(timer)
  }, [router, redirectPath, autoRedirectDelay])

  const handleGoBack = () => {
    router.push(redirectPath)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            You will be redirected automatically in a few seconds...
          </div>
          <Button onClick={handleGoBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}