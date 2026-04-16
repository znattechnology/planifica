import { DashboardLayout } from '@/src/ui/layouts/dashboard-layout';
import { SubscriptionProvider } from '@/src/ui/providers/subscription-provider';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SubscriptionProvider>
  );
}
