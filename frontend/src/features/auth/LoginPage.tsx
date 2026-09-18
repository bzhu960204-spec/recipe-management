import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to="/recipes" replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/recipes', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground">
            <ChefHat className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Kitchen Ledger</h1>
            <p className="text-xs text-muted-foreground">Sign in to your recipe library</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            autoFocus
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={busy || !username || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          Accounts are created by an administrator. There is no public sign-up.
        </p>
      </Card>
    </div>
  );
}
