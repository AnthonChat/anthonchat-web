import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CardSkeletonProps {
  title?: string
  showChart?: boolean
  className?: string
}

/**
 * Shadcn-style card skeleton with clear, high-contrast placeholders.
 * Uses bg-muted-foreground/20 to ensure visibility across themes.
 */
export function CardSkeleton({
  title = "Loading...",
  showChart = false,
  className,
}: CardSkeletonProps) {
  return (
    <Card
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "min-h-[160px]",
        showChart ? "sm:min-h-[200px]" : "",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          <span className="inline-flex items-center gap-2">
            {title}
            {/* Title dot/indicator */}
            <Skeleton className="h-4 w-4 rounded-full bg-muted-foreground/20" />
          </span>
        </CardTitle>
        {/* Action placeholder (date picker, etc.) */}
        <Skeleton className="h-8 w-28 bg-muted-foreground/20" />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Big value */}
        <Skeleton className="h-8 w-28 bg-muted-foreground/20" />

        {/* Subtext rows */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3 bg-muted-foreground/20" />
          <Skeleton className="h-4 w-1/2 bg-muted-foreground/20" />
        </div>

        {/* Progress bars or chart stub */}
        {showChart ? (
          <div className="mt-2 h-16">
            <Skeleton className="h-16 w-full bg-muted-foreground/20" />
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-2 w-full bg-muted-foreground/20" />
            <Skeleton className="h-2 w-5/6 bg-muted-foreground/20" />
            <Skeleton className="h-2 w-2/3 bg-muted-foreground/20" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}