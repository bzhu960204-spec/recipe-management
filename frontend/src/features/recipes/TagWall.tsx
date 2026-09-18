import { ChefHat, ImagePlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';
import { ImageDropZone } from '@/components/ImageDropZone';
import { imageSrc } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/types';
import { useUploadTagCover } from './queries';

interface Props {
  tags: Tag[];
  isLoading: boolean;
  activeSlug?: string;
  totalCount: number;
  onSelect: (slug?: string) => void;
}

/** Tags, not folders: a dish can be Poultry and Quick and Spicy at the same time. */
export function TagWall({ tags, isLoading, activeSlug, totalCount, onSelect }: Props) {
  const uploadCover = useUploadTagCover();

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
        {tags.map((tag) => {
          const cover = imageSrc(tag.coverImageKey, null);
          const isActive = tag.slug === activeSlug;
          return (
            <ImageDropZone
              key={tag.id}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border-2 transition-colors',
                isActive ? 'border-primary' : 'border-transparent hover:border-border',
              )}
              disabled={uploadCover.isPending}
              onFile={(file) => uploadCover.mutate({ id: tag.id, file })}
            >
              {({ openPicker, isDragging }) => (
                <>
                  <button type="button" onClick={() => onSelect(tag.slug)} className="block size-full">
                    {cover ? (
                      <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center bg-muted text-muted-foreground">
                        <ChefHat className="size-6" />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={`Set cover image for ${tag.name}`}
                    title="Set cover image"
                    onClick={openPicker}
                    className={cn(
                      'absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-card/90 text-muted-foreground backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100',
                      isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <ImagePlus className="size-3.5" />
                  </button>

                  <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <span className="truncate">{tag.name}</span>
                    <span className="text-muted-foreground">{tag.recipeCount}</span>
                  </span>
                </>
              )}
            </ImageDropZone>
          );
        })}
      </div>

      {tags.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Tags appear here as soon as you import recipes.
        </p>
      )}
    </div>
  );
}
