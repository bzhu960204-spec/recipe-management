import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Inbox, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ImportMode } from '@/lib/sectionImport';

interface Props {
  open: boolean;
  title: string;
  /** One-line explanation of what a section import does. */
  description?: string;
  placeholder?: string;
  onClose: () => void;
  /** Parses + applies the JSON; return an error message to keep the dialog open, or null on success. */
  onImport: (parsed: unknown, mode: ImportMode) => string | null;
}

const MODES: { id: ImportMode; label: string; hint: string }[] = [
  { id: 'import', label: 'Import', hint: 'Add new entries and update matching ones — nothing is removed.' },
  { id: 'update', label: 'Update', hint: 'Replace this whole block with the JSON.' },
];

export function JsonImportDialog({ open, title, description, placeholder, onClose, onImport }: Props) {
  const [mode, setMode] = useState<ImportMode>('import');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setMode('import');
      setText('');
      setError(null);
      setDragging(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const focus = window.setTimeout(() => textarea.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focus);
    };
  }, [open, onClose]);

  if (!open) return null;

  function readFile(file: File | undefined) {
    if (!file) return;
    void file.text().then((content) => {
      setText(content);
      setError(null);
      textarea.current?.focus();
    });
  }

  function submit() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('That is not valid JSON. Check for a trailing comma or a missing bracket.');
      return;
    }
    const message = onImport(parsed, mode);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  }

  const activeMode = MODES.find((entry) => entry.id === mode)!;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-lg">
        <header className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </header>

        <div className="space-y-3 p-5">
          <div className="flex rounded-[var(--radius-control)] border border-border bg-muted/40 p-1">
            {MODES.map((entry) => {
              const active = mode === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setMode(entry.id)}
                  aria-current={active}
                  className={cn(
                    'flex-1 rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{activeMode.hint}</p>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              readFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex w-full flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/40',
              dragging && 'border-ring bg-muted/60 ring-2 ring-ring ring-inset',
            )}
          >
            <Inbox className="size-6" />
            Drag a JSON file here, or click to browse
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              readFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          <Textarea
            ref={textarea}
            rows={8}
            value={text}
            spellCheck={false}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            placeholder={placeholder ?? 'Paste JSON here'}
            className="font-mono text-xs"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={!text.trim()}>
            {activeMode.label}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
