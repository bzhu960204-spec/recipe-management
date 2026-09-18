import { NavLink } from 'react-router-dom';
import { ChefHat, Clock, Star } from 'lucide-react';
import { Chip, Skeleton } from '@/components/ui/primitives';
import { imageSrc } from '@/lib/api';
import { formatMinutes } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import type { RecipeSummary } from '@/lib/types';

interface Props {
  recipes: RecipeSummary[];
  isLoading: boolean;
  selectedId?: number;
}

export function RecipeList({ recipes, isLoading, selectedId }: Props) {
  if (isLoading) {
    return (
      <ul className="space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={index} className="flex gap-3 p-2">
            <Skeleton className="size-14 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="grid place-items-center px-6 py-16 text-center">
        <ChefHat className="mb-3 size-8 text-muted-foreground" />
        <p className="font-medium">No recipes here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Import some JSON or adjust your filters to see results.
        </p>
      </div>
    );
  }

  return (
    <ul className="p-2">
      {recipes.map((recipe) => {
        const thumbnail = imageSrc(recipe.imageKey, recipe.imageUrl);
        return (
          <li key={recipe.id}>
            <NavLink
              to={`/recipes/${recipe.id}`}
              className={cn(
                'flex gap-3 rounded-[var(--radius-card)] p-2 transition-colors',
                recipe.id === selectedId ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt=""
                  loading="lazy"
                  className="size-14 shrink-0 rounded-[calc(var(--radius-card)-4px)] object-cover"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-[calc(var(--radius-card)-4px)] bg-muted text-muted-foreground">
                  <ChefHat className="size-5" />
                </span>
              )}

              <span className="min-w-0 flex-1 py-0.5">
                <span className="flex items-start gap-1">
                  <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{recipe.title}</span>
                  {recipe.favorite && <Star className="mt-0.5 size-3.5 shrink-0 fill-current text-primary" />}
                </span>

                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {recipe.sourceName && <span className="truncate">{recipe.sourceName}</span>}
                  {recipe.totalMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatMinutes(recipe.totalMinutes)}
                    </span>
                  ) : null}
                </span>
              </span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

export function TagFilterRow({
  tags,
  activeSlug,
  onSelect,
}: {
  tags: Array<{ id: number; name: string; slug: string; recipeCount: number }>;
  activeSlug?: string;
  onSelect: (slug?: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-thin px-3 pb-2 lg:hidden">
      <button type="button" onClick={() => onSelect(undefined)}>
        <Chip active={!activeSlug}>All</Chip>
      </button>
      {tags.map((tag) => (
        <button key={tag.id} type="button" onClick={() => onSelect(tag.slug)} className="shrink-0">
          <Chip active={activeSlug === tag.slug}>
            {tag.name}
            <span className="opacity-60">{tag.recipeCount}</span>
          </Chip>
        </button>
      ))}
    </div>
  );
}
