import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { RecipeDetail } from './RecipeDetail';
import { RecipeList, TagFilterRow } from './RecipeList';
import { TagWall } from './TagWall';
import { useRecipes, useTags } from './queries';

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

  const selectedId = id ? Number(id) : undefined;
  const tagSlug = searchParams.get('tag') ?? undefined;
  const query = searchParams.get('q') ?? '';
  const favorite = searchParams.get('favorite') === 'true';
  const maxMinutes = searchParams.get('maxMinutes') ? Number(searchParams.get('maxMinutes')) : undefined;

  const tags = useTags();
  const recipes = useRecipes({ q: query, tag: tagSlug, favorite, maxMinutes });

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

  const totalCount = recipes.data?.totalElements ?? 0;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[264px_340px_1fr]">
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
          'flex min-h-0 min-w-0 flex-col border-r border-border',
          selectedId ? 'hidden md:flex' : 'flex',
        )}
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

          <p className="mt-2 text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}
            {tagSlug ? ` in ${tags.data?.find((tag) => tag.slug === tagSlug)?.name ?? tagSlug}` : ''}
          </p>
        </header>

        <TagFilterRow tags={tags.data ?? []} activeSlug={tagSlug} onSelect={selectTag} />

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <RecipeList
            recipes={recipes.data?.content ?? []}
            isLoading={recipes.isLoading}
            selectedId={selectedId}
          />
        </div>
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
    </div>
  );
}
