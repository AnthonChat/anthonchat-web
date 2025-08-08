"use client";

import { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export default function Login({
  action,
  message,
  children,
  title,
  description,
  footer,
}: {
  action: ((formData: FormData) => void) | ((formData: FormData) => Promise<void>)
  message: string | null
  children: ReactNode
  title?: string
  description?: string
  footer: ReactNode
}) {
  const t = useTranslations('auth')

  const resolvedTitle = title ?? t('login.title')
  const resolvedDescription = description ?? t('login.subtitle')

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">{resolvedTitle}</CardTitle>
          <CardDescription className="text-base">{resolvedDescription}</CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            {children}
          </CardContent>
          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            {footer}
            {message && (
              <p className="mt-2 p-4 bg-destructive/10 text-destructive text-center w-full rounded-md text-sm">
                {message}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
