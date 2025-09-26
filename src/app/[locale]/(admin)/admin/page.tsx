import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KPI } from "@/components/ui/kpi";
import {
  getNewUsersCount,
  getMessagesCount,
  getUsersPerChannel,
  getDAUWAUMAU,
} from "@/lib/analytics/engagement";
import { fetchAdminUsersSummary } from "@/lib/admin/users";
import { unstable_cache as nextCache } from "next/cache";
import { Users, MessageSquare, TrendingUp, Activity } from "lucide-react";

// Cached dashboard metrics
const cachedGetDashboardMetrics = nextCache(
  async () => { 
    const [newUsers, messages, usersPerChannel, dauwau] = await Promise.all([
      getNewUsersCount({ preset: "7d" }),
      getMessagesCount({ preset: "7d" }),
      getUsersPerChannel("lifetime"),
      getDAUWAUMAU({ preset: "7d" }),
    ]);

    return {
      newUsers,
      messages,
      usersPerChannel,
      dauwau,
    };
  },
  ["dashboard_metrics"],
  { revalidate: 300 } // 5 minutes
);

export default async function AdminIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch dashboard metrics
  const metrics = await cachedGetDashboardMetrics();
  const { newUsers, messages, usersPerChannel, dauwau } = metrics;
  const { dau, wau, mau, stickiness } = dauwau;
  const totalUsers = usersPerChannel.reduce((sum, channel) => sum + channel.users, 0);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total Users"
          value={totalUsers}
          format="number"
          thresholds={{ good: 1000, warning: 500 }}
        />
        <KPI
          label="New Users (7d)"
          value={newUsers}
          format="number"
          thresholds={{ good: 50, warning: 20 }}
        />
        <KPI
          label="Messages (7d)"
          value={messages}
          format="number"
          thresholds={{ good: 1000, warning: 500 }}
        />
        <KPI
          label="Stickiness"
          value={Math.round((stickiness || 0) * 100)}
          format="percentage"
          thresholds={{ good: 60, warning: 40 }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href={`/${locale}/admin/analytics`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>
                Engagement and revenue dashboards with detailed metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View comprehensive analytics, trends, and KPIs
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/users`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Users</CardTitle>
              </div>
              <CardDescription>
                User management, subscriptions, and channel connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage users, view subscriptions, and handle bulk operations
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/broadcast`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle>Broadcast</CardTitle>
              </div>
              <CardDescription>
                Send messages and voice notes to user segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and send broadcasts with template support
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-primary">{dau}</div>
              <div className="text-sm text-muted-foreground">Daily Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{wau}</div>
              <div className="text-sm text-muted-foreground">Weekly Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-primary">{mau}</div>
              <div className="text-sm text-muted-foreground">Monthly Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
