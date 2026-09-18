import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, FileJson, Pencil, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card, Chip } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import type { ImportPreview, RecipeUpsert } from '@/lib/types';
import { RecipeForm } from '../recipes/RecipeForm';
import { useImportCommit, useImportPreview, useImportPreviewFile } from '../recipes/queries';

export function ImportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);

  // The templates page hands its example over through router state.
  const [text, setText] = useState(() => (location.state as { json?: string } | null)?.json ?? '');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewJson = useImportPreview();
  const previewFile = useImportPreviewFile();
  const commit = useImportCommit();

  function handleError(cause: unknown) {
    setPreview(null);
    setError(cause instanceof ApiError ? cause.message : 'Something went wrong');
  }

  function showPreview(next: ImportPreview) {
    setPreview(next);
    setEditingIndex(null);
  }

  /** Corrections happen here, before anything is written: preview → fix → commit. */
  function applyEdit(index: number, recipe: RecipeUpsert) {
    setPreview((current) =>
      current === null
        ? current
        : {
            ...current,
            items: current.items.map((item) =>
              item.index === index ? { ...item, recipe, warnings: [] } : item,
            ),
          },
    );
    setEditingIndex(null);
  }

  function runPreview() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('That is not valid JSON. Check for a trailing comma or a missing bracket.');
      return;
    }
    previewJson.mutate(parsed, { onSuccess: showPreview, onError: handleError });
  }

  function runFilePreview(file: File) {
    setError(null);
    previewFile.mutate(file, { onSuccess: showPreview, onError: handleError });
  }

  function runCommit() {
    if (!preview) return;
    commit.mutate(
      preview.items.map((item) => item.recipe),
      {
        onSuccess: (created) => navigate(created.length === 1 ? `/recipes/${created[0].id}` : '/recipes'),
        onError: handleError,
      },
    );
  }

  const warningCount = preview?.items.reduce((total, item) => total + item.warnings.length, 0) ?? 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-bold">Import recipes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the JSON your model produced, or upload a .json file. Nothing is saved until you review the
          preview below. Need the prompt that produces it?{' '}
          <Link to="/templates" className="underline underline-offset-2 hover:text-foreground">
            Grab a template
          </Link>
          .
        </p>

        <Card className="mt-6 p-4">
          <Textarea
            rows={10}
            className="font-mono text-xs"
            placeholder='{ "title": "Shoyu Chicken", "ingredients": ["1 cup soy sauce"], "steps": ["Combine everything."] }'
            value={text}
            onChange={(event) => setText(event.target.value)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={runPreview} disabled={!text.trim() || previewJson.isPending}>
              <FileJson />
              {previewJson.isPending ? 'Checking…' : 'Preview'}
            </Button>

            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={previewFile.isPending}>
              <Upload />
              Upload .json
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) runFilePreview(file);
                event.target.value = '';
              }}
            />
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </Card>

        {preview && (
          <section className="mt-6">
            <header className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {preview.recipeCount} {preview.recipeCount === 1 ? 'recipe' : 'recipes'} ready
              </h2>
              {warningCount > 0 && (
                <Chip>
                  <AlertTriangle />
                  {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                </Chip>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                onClick={runCommit}
                disabled={commit.isPending || editingIndex !== null}
              >
                {commit.isPending ? 'Saving…' : 'Save to library'}
              </Button>
            </header>

            <ul className="space-y-3">
              {preview.items.map((item) => (
                <Card key={item.index} className="p-4">
                  {editingIndex === item.index ? (
                    <RecipeForm
                      initial={item.recipe}
                      submitLabel="Apply changes"
                      onSubmit={(recipe) => applyEdit(item.index, recipe)}
                      onCancel={() => setEditingIndex(null)}
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold">{item.recipe.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {item.recipe.ingredients?.length ?? 0} ingredients · {item.recipe.steps?.length ?? 0} steps
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => setEditingIndex(item.index)}
                        >
                          <Pencil />
                          Fix
                        </Button>
                      </div>

                      {(item.recipe.tags?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.recipe.tags?.map((tag) => <Chip key={tag}>{tag}</Chip>)}
                        </div>
                      )}

                      {item.warnings.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-border pt-3">
                          {item.warnings.map((warning) => (
                            <li key={warning} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </Card>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
