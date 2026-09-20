import { ChefHat, ImagePlus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';
import { ImageDropZone } from '@/components/ImageDropZone';
import { imageSrc } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { useDeleteCategory, useUploadCategoryCover } from './queries';

interface Props {
  categories: Category[];
  isLoading: boolean;
  activeSlug?: string;
  totalCount: number;
  onSelect: (slug?: string) => void;
}

/** Folders, not tags: a dish belongs to exactly one category (or none). */
export function CategoryWall({ categories, isLoading, activeSlug, totalCount, onSelect }: Props) {
  const uploadCover = useUploadCategoryCover();
  const deleteCategory = useDeleteCategory();

  function handleDelete(category: Category) {
    const message =
      category.recipeCount > 0
        ? `Delete category "${category.name}"? ${category.recipeCount} recipe(s) will become uncategorised, but the recipes stay.`
        : `Delete category "${category.name}"?`;
    if (!window.confirm(message)) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        if (category.slug === activeSlug) onSelect(undefined);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/3] rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-3">
      <button type="button" onClick={() => onSelect(undefined)} className="mb-2 w-full">
        <span
          className={cn(
            'flex items-center justify-between rounded-[var(--radius-card)] border px-3 py-2 text-sm font-medium transition-colors',
            activeSlug
              ? 'border-border bg-card hover:bg-muted'
              : 'border-primary bg-accent text-accent-foreground',
          )}
        >
          All recipes
          <span className="text-xs text-muted-foreground">{totalCount}</span>
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const cover = imageSrc(category.coverImageKey, null);
          const isActive = category.slug === activeSlug;
          return (
            <ImageDropZone
              key={category.id}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border-2 transition-colors',
                isActive ? 'border-primary' : 'border-transparent hover:border-border',
              )}
              disabled={uploadCover.isPending}
              onFile={(file) => uploadCover.mutate({ id: category.id, file })}
            >
              {({ openPicker, isDragging }) => (
                <>
                  <button type="button" onClick={() => onSelect(category.slug)} className="block size-full">
                    {cover ? (
                      <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center bg-muted text-muted-foreground">
                        <ChefHat className="size-6" />
                      </span>
                    )}
                  </button>

                  <div
                    className={cn(
                      'absolute right-1.5 top-1.5 flex items-center gap-1 transition-opacity focus-within:opacity-100',
                      isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`Set cover image for ${category.name}`}
                      title="Set cover image"
                      onClick={openPicker}
                      className="grid size-7 place-items-center rounded-full bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
                    >
                      <ImagePlus className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete category ${category.name}`}
                      title="Delete category"
                      onClick={() => handleDelete(category)}
                      disabled={deleteCategory.isPending}
                      className="grid size-7 place-items-center rounded-full bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <span className="truncate">{category.name}</span>
                    <span className="text-muted-foreground">{category.recipeCount}</span>
                  </span>
                </>
              )}
            </ImageDropZone>
          );
        })}
      </div>

      {categories.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Categories appear here as soon as you import recipes.
        </p>
      )}
    </div>
  );
}
