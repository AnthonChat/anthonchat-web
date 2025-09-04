import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AdminAnalyticsIndex({ params }: { params: { locale: string } }) {
  const { locale } = params
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Admin Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={`/${locale}/admin/analytics/engagement`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
              <CardDescription>
                Messages, users per channel, and signups attribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View engagement metrics</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${locale}/admin/analytics/revenue`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>
                Earnings, trial renewals, churn, and MRR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View revenue metrics</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
