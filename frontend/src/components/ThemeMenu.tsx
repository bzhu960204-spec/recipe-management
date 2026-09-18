import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { THEMES, useThemeStore } from '@/stores/theme';
import type { ThemeId, ThemeMode } from '@/lib/types';

export function ThemeMenu() {
  const { themeId, mode, setTheme, setMode } = useThemeStore();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Persist the choice so it follows the account to other devices; local state already updated.
  function remember(next: { themeId?: ThemeId; themeMode?: ThemeMode }) {
    if (!user) return;
    void api
      .patch<typeof user>('/api/auth/me/preferences', next)
      .then(setUser)
      .catch(() => undefined);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        title="Appearance"
        className="flex w-16 flex-col items-center gap-1 rounded-[var(--radius-control)] px-1 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette className="size-5" />
        Theme
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-[var(--radius-card)] border border-border bg-card p-1.5 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Theme
          </DropdownMenu.Label>

          {THEMES.map((theme) => (
            <DropdownMenu.Item
              key={theme.id}
              onSelect={() => {
                setTheme(theme.id);
                remember({ themeId: theme.id });
              }}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-[var(--radius-control)] px-2 py-2 text-sm outline-none',
                themeId === theme.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              <Check className={cn('mt-0.5 size-4 shrink-0', themeId === theme.id ? 'opacity-100' : 'opacity-0')} />
              <span>
                <span className="block font-medium">{theme.label}</span>
                <span className="block text-xs text-muted-foreground">{theme.description}</span>
              </span>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          <div className="flex gap-1 px-1 pb-1">
            {(['light', 'dark'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  remember({ themeMode: value });
                }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-sm capitalize',
                  mode === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {value === 'light' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {value}
              </button>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
