import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/primitives';
import { UsersSection } from '@/features/admin/UsersSection';
import { ServerProxySection } from '@/features/admin/ServerProxySection';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { THEMES, useThemeStore } from '@/stores/theme';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { themeId, mode, setTheme, setMode } = useThemeStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await api.post('/api/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ tone: 'ok', text: 'Password updated.' });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof ApiError ? cause.message : 'Could not update password' });
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.displayName ?? user?.username} ({user?.role.toLowerCase()})
          </p>
        </div>

        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">Appearance</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Themes are pure design tokens, so switching one never changes layout or behaviour.
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                className={cn(
                  'rounded-[var(--radius-card)] border p-3 text-left transition-colors',
                  themeId === theme.id ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted',
                )}
              >
                <span className="block text-sm font-semibold">{theme.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{theme.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {(['light', 'dark'] as const).map((value) => (
              <Button
                key={value}
                variant={mode === value ? 'primary' : 'outline'}
                size="sm"
                className="capitalize"
                onClick={() => setMode(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="New password (at least 8 characters)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {message && (
              <p className={cn('text-sm', message.tone === 'ok' ? 'text-muted-foreground' : 'text-destructive')}>
                {message.text}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={!currentPassword || newPassword.length < 8}
            >
              Update password
            </Button>
          </form>
        </Card>

        {user?.role === 'ADMIN' && (
          <>
            <ServerProxySection />
            <UsersSection currentUserId={user.id} />
          </>
        )}

        <Button variant="outline" onClick={() => void logout()}>
          <LogOut />
          Sign out
        </Button>
      </div>
    </div>
  );
}
