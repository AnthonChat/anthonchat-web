import { ReactNode } from 'react'

export default function Login({
  action,
  message,
  children,
}: {
  action: ((formData: FormData) => void) | ((formData: FormData) => Promise<void>)
  message: string | null
  children: ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <form
        className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
        action={action}
      >
        {children}
        {message && (
          <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
