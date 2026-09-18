import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import type { TemplateVersion } from '@/lib/types';
import { useSaveTemplateVersion } from './queries';

/**
 * Edits are held locally and committed as one new version, so the history stays a list of
 * deliberate saves rather than a keystroke log.
 */
export function TemplateEditor({
  id,
  version,
  nextVersionNo,
  onDone,
  onCancel,
}: {
  id: number;
  version: TemplateVersion;
  nextVersionNo: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useSaveTemplateVersion();
  const [schema, setSchema] = useState(version.schema ?? '');
  const [example, setExample] = useState(version.example ?? '');
  const [changelog, setChangelog] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    save.mutate(
      { id, schema, example: example.trim() || undefined, changelog: changelog.trim() },
      {
        onSuccess: onDone,
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : 'Could not save the version'),
      },
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <Field label="Schema">
        <Textarea
          rows={20}
          className="font-mono text-xs"
          value={schema}
          onChange={(event) => setSchema(event.target.value)}
        />
      </Field>

      <Field label="Example (optional)">
        <Textarea
          rows={10}
          className="font-mono text-xs"
          value={example}
          onChange={(event) => setExample(event.target.value)}
        />
      </Field>

      <Field label="What changed?">
        <Input
          placeholder="Added an optional flag"
          value={changelog}
          onChange={(event) => setChangelog(event.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={submit} disabled={!schema.trim() || save.isPending}>
          {save.isPending ? 'Saving…' : `Save as v${nextVersionNo}`}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
