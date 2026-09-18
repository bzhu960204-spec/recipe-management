import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, CalendarDays, ChefHat, Download, FileCode2, Settings, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeMenu } from '@/components/ThemeMenu';

/**
 * The nav rail is the extension socket: shipping meal planning or a shopping list later
 * means adding an entry here and a route, with no change to any existing screen.
 */
const NAV_ITEMS = [
  { to: '/recipes', label: 'Recipes', icon: BookOpen, ready: true },
  { to: '/import', label: 'Import', icon: Download, ready: true },
  { to: '/templates', label: 'Templates', icon: FileCode2, ready: true },
  { to: '/plan', label: 'Meal Plan', icon: CalendarDays, ready: false },
  { to: '/shopping', label: 'Shopping', icon: ShoppingCart, ready: false },
];

export function AppShell() {
  const items = NAV_ITEMS.filter((item) => item.ready);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <nav className="hidden w-[76px] shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-4 md:flex">
        <span className="mb-4 grid size-10 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground">
          <ChefHat className="size-5" />
        </span>

        {items.map((item) => (
          <RailLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}

        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeMenu />
          <RailLink to="/settings" label="Settings" icon={Settings} />
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-hidden pb-14 md:pb-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t border-border bg-card md:hidden">
        {[...items, { to: '/settings', label: 'Settings', icon: Settings }].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function RailLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        cn(
          'flex w-16 flex-col items-center gap-1 rounded-[var(--radius-control)] px-1 py-2 text-[11px] transition-colors',
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}
