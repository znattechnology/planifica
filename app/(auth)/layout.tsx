import { AuthLayout } from '@/src/ui/layouts/auth-layout';

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
