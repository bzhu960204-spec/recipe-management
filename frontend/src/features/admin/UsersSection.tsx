import { useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, Chip, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import type { Role, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCreateUser, useResetUserPassword, useSetUserEnabled, useUsers } from './queries';

const MIN_PASSWORD_LENGTH = 8;

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

/** Registration is closed by design, so this is the only way an account comes into existence. */
export function UsersSection({ currentUserId }: { currentUserId?: number }) {
  const users = useUsers(true);
  const createUser = useCreateUser();
  const setEnabled = useSetUserEnabled();

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setUsername('');
    setPassword('');
    setDisplayName('');
    setEmail('');
    setRole('USER');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    createUser.mutate(
      {
        username: username.trim(),
        password,
        email: email.trim() || null,
        displayName: displayName.trim() || null,
        role,
      },
      {
        onSuccess: () => {
          resetForm();
          setShowForm(false);
        },
        onError: (cause) => setError(messageOf(cause, 'Could not create the account')),
      },
    );
  }

  return (
    <Card className="p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            Each account has its own recipe library. Sign-up is closed, so accounts are created here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm((open) => !open)}>
          <UserPlus />
          {showForm ? 'Cancel' : 'New user'}
        </Button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="mb-5 space-y-3 rounded-[var(--radius-card)] border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              autoComplete="off"
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
              autoComplete="new-password"
              required
            />
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name (optional)"
            />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (optional)"
            />
            <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            disabled={createUser.isPending || !username.trim() || password.length < MIN_PASSWORD_LENGTH}
          >
            {createUser.isPending ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      )}

      {users.isLoading && <Skeleton className="h-24 w-full" />}
      {users.isError && <p className="text-sm text-destructive">Could not load the user list.</p>}

      <ul className="divide-y divide-border">
        {(users.data ?? []).map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentUserId}
            busy={setEnabled.isPending}
            onToggleEnabled={() => setEnabled.mutate({ id: user.id, enabled: !user.enabled })}
          />
        ))}
      </ul>
    </Card>
  );
}

function UserRow({
  user,
  isSelf,
  busy,
  onToggleEnabled,
}: {
  user: User;
  isSelf: boolean;
  busy: boolean;
  onToggleEnabled: () => void;
}) {
  const resetPassword = useResetUserPassword();
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function submitReset(event: React.FormEvent) {
    event.preventDefault();
    resetPassword.mutate(
      { id: user.id, newPassword },
      {
        onSuccess: () => {
          setNewPassword('');
          setShowReset(false);
          setFeedback({ tone: 'ok', text: 'Password reset.' });
        },
        onError: (cause) => setFeedback({ tone: 'error', text: messageOf(cause, 'Could not reset the password') }),
      },
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user.displayName ?? user.username}
            {isSelf && <span className="ml-2 text-xs text-muted-foreground">you</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.username}
            {user.email ? ` · ${user.email}` : ''}
          </p>
        </div>

        <Chip>{user.role.toLowerCase()}</Chip>
        {!user.enabled && <Chip className="text-destructive">disabled</Chip>}

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Reset password for ${user.username}`}
          onClick={() => {
            setFeedback(null);
            setShowReset((open) => !open);
          }}
        >
          <KeyRound />
          Reset
        </Button>

        {/* Locking yourself out of the only admin account would need a database edit to undo. */}
        <Button variant="ghost" size="sm" disabled={isSelf || busy} onClick={onToggleEnabled}>
          {user.enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>

      {showReset && (
        <form onSubmit={submitReset} className="mt-2 flex flex-wrap gap-2">
          <Input
            type="password"
            className="max-w-xs"
            autoComplete="new-password"
            placeholder={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={newPassword.length < MIN_PASSWORD_LENGTH || resetPassword.isPending}
          >
            {resetPassword.isPending ? 'Saving…' : 'Set password'}
          </Button>
        </form>
      )}

      {feedback && (
        <p className={cn('mt-2 text-xs', feedback.tone === 'ok' ? 'text-muted-foreground' : 'text-destructive')}>
          {feedback.text}
        </p>
      )}
    </li>
  );
}
