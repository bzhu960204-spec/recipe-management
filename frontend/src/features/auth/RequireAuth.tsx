import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'unknown') {
    return <div className="grid h-[100dvh] place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
