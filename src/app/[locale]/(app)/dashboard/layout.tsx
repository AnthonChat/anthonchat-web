export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={"min-h-screen bg-gradient-to-br from-background via-muted/50 to-background"}>
      {children}
    </div>
  );
}