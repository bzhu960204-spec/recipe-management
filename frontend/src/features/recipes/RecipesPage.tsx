import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckSquare, Download, Search, SlidersHorizontal, Star, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import type { ImportPreview } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ImportConfirmDialog } from './ImportConfirmDialog';
import { RecipeDetail } from './RecipeDetail';
import { RecipeList, TagFilterRow } from './RecipeList';
import { exportRecipes } from './recipeExport';
import { TagWall } from './TagWall';
import { fetchAllRecipeSummaries, useImportCommit, useImportPreviewFile, useRecipes, useTags } from './queries';

const DURATION_FILTERS = [
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 60 min', value: 60 },
];

export function RecipesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedId = id ? Number(id) : undefined;
  const tagSlug = searchParams.get('tag') ?? undefined;
  const query = searchParams.get('q') ?? '';
  const favorite = searchParams.get('favorite') === 'true';
  const maxMinutes = searchParams.get('maxMinutes') ? Number(searchParams.get('maxMinutes')) : undefined;

  const filters = { q: query, tag: tagSlug, favorite, maxMinutes };
  const tags = useTags();
  const recipes = useRecipes(filters);
  const previewFile = useImportPreviewFile();
  const commit = useImportCommit();

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  function selectTag(slug?: string) {
    setParam('tag', slug);
    if (selectedId) navigate(`/recipes?${new URLSearchParams(slug ? { tag: slug } : {}).toString()}`);
  }

  function toggleSelect(recipeId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setActionError(null);
  }

  async function selectAll() {
    setActionError(null);
    try {
      const all = await fetchAllRecipeSummaries(filters);
      setSelectedIds(new Set(all.map((recipe) => recipe.id)));
    } catch {
      setActionError('Could not load the full list to select.');
    }
  }

  async function runExport() {
    if (selectedIds.size === 0) return;
    setActionError(null);
    setExporting(true);
    try {
      await exportRecipes([...selectedIds]);
      exitSelectMode();
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function handleDrop(file: File) {
    setActionError(null);
    previewFile.mutate(file, {
      onSuccess: setImportPreview,
      onError: (cause) => setActionError(cause instanceof ApiError ? cause.message : 'Could not read that file.'),
    });
  }

  function confirmImport() {
    if (!importPreview) return;
    setActionError(null);
    commit.mutate(
      importPreview.items.map((item) => item.recipe),
      {
        onSuccess: () => setImportPreview(null),
        onError: (cause) => setActionError(cause instanceof ApiError ? cause.message : 'Import failed.'),
      },
    );
  }

  const totalCount = recipes.data?.totalElements ?? 0;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[clamp(300px,32vw,340px)_minmax(0,1fr)] lg:grid-cols-[clamp(210px,17vw,264px)_clamp(300px,24vw,360px)_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-y-auto scrollbar-thin border-r border-border lg:block">
        <TagWall
          tags={tags.data ?? []}
          isLoading={tags.isLoading}
          activeSlug={tagSlug}
          totalCount={totalCount}
          onSelect={selectTag}
        />
      </aside>

      <section
        className={cn(
          'relative flex min-h-0 min-w-0 flex-col border-r border-border',
          selectedId ? 'hidden md:flex' : 'flex',
        )}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes('Files')) {
            event.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = Array.from(event.dataTransfer.files).find(
            (candidate) => candidate.type === 'application/json' || candidate.name.toLowerCase().endsWith('.json'),
          );
          if (file) handleDrop(file);
          else setActionError('Drop a .json recipe file to import.');
        }}
      >
        <header className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search titles and ingredients"
                value={query}
                onChange={(event) => setParam('q', event.target.value)}
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="icon"
              aria-label="Filters"
              onClick={() => setShowFilters((open) => !open)}
            >
              <SlidersHorizontal />
            </Button>
            <Button
              variant={selectMode ? 'primary' : 'outline'}
              size="icon"
              aria-label={selectMode ? 'Cancel selection' : 'Select recipes to export'}
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              <CheckSquare />
            </Button>
            <Button variant="outline" size="icon" aria-label="New recipe" onClick={() => navigate('/recipes/new')}>
              <Plus />
            </Button>
          </div>

          {showFilters && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setParam('favorite', favorite ? undefined : 'true')}>
                <Chip active={favorite}>
                  <Star className={cn(favorite && 'fill-current')} />
                  Favourites
                </Chip>
              </button>
              {DURATION_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setParam('maxMinutes', maxMinutes === filter.value ? undefined : String(filter.value))
                  }
                >
                  <Chip active={maxMinutes === filter.value}>{filter.label}</Chip>
                </button>
              ))}
            </div>
          )}

          {selectMode ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={() => void selectAll()}>
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={() => void runExport()}
                disabled={selectedIds.size === 0 || exporting}
              >
                <Download />
                {exporting ? 'Exporting…' : `Export${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}
              {tagSlug ? ` in ${tags.data?.find((tag) => tag.slug === tagSlug)?.name ?? tagSlug}` : ''}
            </p>
          )}

          {actionError && !importPreview && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
        </header>

        <TagFilterRow tags={tags.data ?? []} activeSlug={tagSlug} onSelect={selectTag} />

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <RecipeList
            recipes={recipes.data?.content ?? []}
            isLoading={recipes.isLoading}
            selectedId={selectedId}
            selectable={selectMode}
            checkedIds={selectedIds}
            onToggle={toggleSelect}
          />
        </div>

        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/80 p-4">
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-ring px-6 py-8 text-sm font-medium">
              <Upload className="size-6" />
              Drop a recipe file to import
            </div>
          </div>
        )}
      </section>

      <section className={cn('min-h-0', selectedId ? 'block' : 'hidden md:block')}>
        {selectedId ? (
          <RecipeDetail id={selectedId} />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">
              Pick a recipe to see its ingredients and method.
            </p>
          </div>
        )}
      </section>

      {importPreview && (
        <ImportConfirmDialog
          preview={importPreview}
          pending={commit.isPending}
          error={actionError}
          onConfirm={confirmImport}
          onClose={() => {
            setImportPreview(null);
            setActionError(null);
          }}
        />
      )}
    </div>
  );
}
