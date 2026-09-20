import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/primitives';
import type { ImportPreview } from '@/lib/types';

interface Props {
  preview: ImportPreview;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Read-only confirmation of a dropped recipe file: counts + warnings, then commit. */
export function ImportConfirmDialog({ preview, pending, error, onConfirm, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, pending]);

  const warningCount = preview.items.reduce((total, item) => total + item.warnings.length, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import recipes"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-lg">
        <header className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">
              Import {preview.recipeCount} {preview.recipeCount === 1 ? 'recipe' : 'recipes'}?
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review what will be added to your library. Nothing is saved until you confirm.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={pending}>
            <X />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin p-5">
          {warningCount > 0 && (
            <Chip>
              <AlertTriangle />
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </Chip>
          )}

          <ul className="space-y-2">
            {preview.items.map((item) => (
              <li key={item.index} className="rounded-[var(--radius-card)] border border-border p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{item.recipe.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.recipe.ingredients?.length ?? 0} ingredients · {item.recipe.steps?.length ?? 0} steps
                  </span>
                </div>
                {item.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border pt-2">
                    {item.warnings.map((warning) => (
                      <li key={warning} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} disabled={pending}>
            {pending ? 'Importing…' : 'Confirm import'}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
