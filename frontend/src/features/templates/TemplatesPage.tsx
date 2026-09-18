import { useEffect, useState } from 'react';
import { FileCode2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, Chip, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TemplateSummary } from '@/lib/types';
import { TemplateDetail } from './TemplateDetail';
import { useCreateTemplate, useTemplates } from './queries';

const STARTER_SCHEMA = `Describe the import format here.

One line per record. Note the fields and any separators, and add an example.
`;

export function TemplatesPage() {
  const templates = useTemplates();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const items = templates.data ?? [];

  // The built-in template is seeded on the first list call, so there is always something to show.
  useEffect(() => {
    if (selectedId === null && items.length > 0) setSelectedId(items[0].id);
  }, [items, selectedId]);

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border md:flex">
        <header className="flex items-center gap-2 px-4 py-4">
          <h1 className="text-lg font-bold">Templates</h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            title="New template"
            onClick={() => setCreating((open) => !open)}
          >
            <Plus />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
          {creating && (
            <CreateTemplateForm
              onCancel={() => setCreating(false)}
              onCreated={(id) => {
                setSelectedId(id);
                setCreating(false);
              }}
            />
          )}

          {templates.isPending && <Skeleton className="h-16 w-full" />}

          <ul className="space-y-1.5">
            {items.map((template) => (
              <li key={template.id}>
                <TemplateListItem
                  template={template}
                  active={template.id === selectedId}
                  onSelect={() => setSelectedId(template.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="mb-4 md:hidden">
            <Select
              value={selectedId ?? ''}
              onChange={(event) => setSelectedId(Number(event.target.value))}
            >
              {items.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · v{template.currentVersionNo}
                </option>
              ))}
            </Select>
          </div>

          {selectedId === null ? (
            <p className="text-sm text-muted-foreground">Select a template.</p>
          ) : (
            <TemplateDetail
              id={selectedId}
              onSelect={setSelectedId}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateListItem({
  template,
  active,
  onSelect,
}: {
  template: TemplateSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-[var(--radius-control)] px-3 py-2.5 text-left transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
      )}
    >
      <span className="flex items-center gap-2">
        <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{template.name}</span>
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        v{template.currentVersionNo}
        {template.versionCount > 1 && ` · ${template.versionCount} versions`}
        {template.archived && ' · archived'}
      </span>
    </button>
  );
}

function CreateTemplateForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: number) => void;
}) {
  const create = useCreateTemplate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    create.mutate(
      { name: name.trim(), description: description.trim(), schema: STARTER_SCHEMA },
      {
        onSuccess: (template) => onCreated(template.id),
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : 'Could not create the template'),
      },
    );
  }

  return (
    <Card className="mb-3 space-y-2 p-3">
      <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <Textarea
        rows={2}
        placeholder="What is it for?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim() || create.isPending}>
          Create
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Starts from a stub. To build on an existing prompt, use <Chip className="px-1.5 py-0">Duplicate</Chip>{' '}
        instead.
      </p>
    </Card>
  );
}
