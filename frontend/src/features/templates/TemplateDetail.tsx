import { useEffect, useState } from 'react';
import { Archive, Check, Copy, Files, History, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Chip, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TemplateEditor } from './TemplateEditor';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplate,
  useRestoreTemplateVersion,
  useUpdateTemplate,
} from './queries';

type Tab = 'schema' | 'example' | 'history';

export function TemplateDetail({
  id,
  onSelect,
  onDeleted,
}: {
  id: number;
  onSelect: (id: number) => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<Tab>('schema');
  const [viewingVersion, setViewingVersion] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useTemplate(id, viewingVersion);
  const restore = useRestoreTemplateVersion();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();
  const duplicate = useCreateTemplate();

  useEffect(() => {
    setViewingVersion(undefined);
    setEditing(false);
    setError(null);
  }, [id]);

  const template = query.data;
  if (query.isPending || !template) return <Skeleton className="h-64 w-full" />;

  const version = template.version;
  const isHistoric = version.versionNo !== template.currentVersionNo;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'schema', label: 'Schema' },
    ...(version.example ? [{ id: 'example' as const, label: 'Example' }] : []),
    { id: 'history', label: 'History' },
  ];
  const activeTab = tab === 'example' && !version.example ? 'schema' : tab;

  function fail(cause: unknown) {
    setError(cause instanceof ApiError ? cause.message : 'Something went wrong');
  }

  return (
    <>
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{template.name}</h2>
          <Chip>v{template.currentVersionNo}</Chip>
          {template.builtin && <Chip>built-in</Chip>}
          {template.archived && <Chip>archived</Chip>}
        </div>
        {template.description && (
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
        )}
      </header>

      <nav className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === item.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.id === 'history' && ` (${template.versions.length})`}
          </button>
        ))}
      </nav>

      {isHistoric && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 border-primary p-3 text-sm">
          <History className="size-4" />
          Viewing v{version.versionNo}, not the current prompt.
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setViewingVersion(undefined)}>
            Back to v{template.currentVersionNo}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={restore.isPending}
            onClick={() =>
              restore.mutate(
                { id, versionNo: version.versionNo },
                { onSuccess: () => setViewingVersion(undefined), onError: fail },
              )
            }
          >
            Restore
          </Button>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {activeTab === 'schema' &&
        (editing ? (
          <TemplateEditor
            id={id}
            version={version}
            nextVersionNo={template.currentVersionNo + 1}
            onDone={() => {
              setEditing(false);
              setViewingVersion(undefined);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <CopyButton label="Copy" variant="outline" text={version.schema ?? ''} />
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
            </div>
            <CodeBlock text={version.schema ?? ''} />
          </section>
        ))}

      {activeTab === 'example' && version.example && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Copy" variant="outline" text={version.example} />
          </div>
          <CodeBlock text={version.example} />
        </section>
      )}

      {activeTab === 'history' && (
        <ul className="space-y-2">
          {template.versions.map((entry) => (
            <Card key={entry.versionNo} className="flex flex-wrap items-center gap-2 p-3">
              <Chip active={entry.versionNo === template.currentVersionNo}>v{entry.versionNo}</Chip>
              <span className="text-sm">{entry.changelog ?? 'No note'}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  setViewingVersion(
                    entry.versionNo === template.currentVersionNo ? undefined : entry.versionNo,
                  );
                  setTab('schema');
                }}
              >
                View
              </Button>
            </Card>
          ))}
        </ul>
      )}

      <footer className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={duplicate.isPending}
          onClick={() =>
            duplicate.mutate(
              {
                name: `${template.name} copy`,
                description: template.description ?? undefined,
                schema: version.schema ?? '',
                example: version.example ?? undefined,
              },
              { onSuccess: (copy) => onSelect(copy.id), onError: fail },
            )
          }
        >
          <Files />
          Duplicate
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={update.isPending}
          onClick={() => update.mutate({ id, archived: !template.archived }, { onError: fail })}
        >
          <Archive />
          {template.archived ? 'Unarchive' : 'Archive'}
        </Button>

        {!template.builtin && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (!window.confirm(`Delete "${template.name}"? Every version goes with it.`)) return;
              remove.mutate(id, { onSuccess: onDeleted, onError: fail });
            }}
          >
            <Trash2 />
            Delete
          </Button>
        )}
      </footer>
    </>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <Card className="overflow-x-auto p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{text}</pre>
    </Card>
  );
}

function CopyButton({
  text,
  label,
  variant,
}: {
  text: string;
  label: string;
  variant: 'primary' | 'outline';
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant={variant}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
