import { DashboardLayout } from '@/src/ui/layouts/dashboard-layout';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
