import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChefHat,
  Clock,
  ExternalLink,
  FileDown,
  Gauge,
  ImagePlus,
  Pencil,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Chip, Skeleton } from '@/components/ui/primitives';
import { ImageDropZone } from '@/components/ImageDropZone';
import { imageSrc } from '@/lib/api';
import { formatMinutes, scaleFactor } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import { CookMode } from './CookMode';
import { openRecipeHtml } from './exportHtml';
import { IngredientPanel } from './IngredientPanel';
import {
  useDeleteRecipe,
  useRecipe,
  useRemoveRecipeImage,
  useSaveNotes,
  useToggleFavorite,
  useUploadRecipeImage,
} from './queries';

export function RecipeDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const { data: recipe, isLoading } = useRecipe(id);
  const toggleFavorite = useToggleFavorite();
  const saveNotes = useSaveNotes();
  const deleteRecipe = useDeleteRecipe();
  const uploadImage = useUploadRecipeImage();
  const removeImage = useRemoveRecipeImage();

  const [servings, setServings] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset per-recipe view state whenever a different recipe is opened.
  useEffect(() => {
    setChecked(new Set());
    setCooking(false);
  }, [id]);

  useEffect(() => {
    if (!recipe) return;
    setServings(recipe.baseServings ? Math.round(recipe.baseServings) : 1);
    setNotes(recipe.personalNotes ?? '');
  }, [recipe]);

  const factor = useMemo(() => scaleFactor(recipe?.baseServings ?? null, servings), [recipe?.baseServings, servings]);

  function toggleIngredient(ingredientId: number) {
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  }

  if (isLoading || !recipe) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-56 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  const hero = imageSrc(recipe.imageKey, recipe.imageUrl);

  return (
    <article className="h-full overflow-y-auto scrollbar-thin">
      <ImageDropZone
        className="relative"
        disabled={uploadImage.isPending}
        onFile={(file) => uploadImage.mutate({ id: recipe.id, file })}
      >
        {({ openPicker, isDragging }) => (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to list"
              className="absolute left-3 top-3 z-10 md:hidden"
              onClick={() => navigate('/recipes')}
            >
              <ArrowLeft />
            </Button>

            {hero ? (
              <img src={hero} alt="" className="h-56 w-full object-cover sm:h-72" loading="lazy" />
            ) : (
              <div className="grid h-40 w-full place-items-center bg-muted text-muted-foreground">
                <ChefHat className="size-8" />
              </div>
            )}

            {isDragging && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 text-sm font-medium">
                Drop a photo to use it as the cover
              </div>
            )}

            <div className="absolute right-3 top-3 flex gap-2">
              <Button
                variant={recipe.favorite ? 'primary' : 'outline'}
                size="icon"
                aria-label={recipe.favorite ? 'Remove from favourites' : 'Add to favourites'}
                onClick={() => toggleFavorite.mutate({ id: recipe.id, favorite: !recipe.favorite })}
              >
                <Star className={cn(recipe.favorite && 'fill-current')} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Export recipe"
                onClick={() => void openRecipeHtml(recipe)}
              >
                <FileDown />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Edit recipe"
                onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              >
                <Pencil />
              </Button>
            </div>

            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={openPicker} disabled={uploadImage.isPending}>
                <ImagePlus />
                {uploadImage.isPending ? 'Uploading…' : recipe.imageKey ? 'Replace photo' : 'Add photo'}
              </Button>
              {recipe.imageKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeImage.mutate(recipe.id)}
                  disabled={removeImage.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          </>
        )}
      </ImageDropZone>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <Chip key={tag.id} className="uppercase">
              {tag.name}
            </Chip>
          ))}
        </div>

        <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>
        {recipe.description && <p className="mt-2 text-muted-foreground">{recipe.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {recipe.totalMinutes ? (
            <Chip>
              <Clock />
              {formatMinutes(recipe.totalMinutes)}
            </Chip>
          ) : null}
          {recipe.baseServings ? (
            <Chip>
              <Users />
              Serves {recipe.baseServings}
            </Chip>
          ) : null}
          {recipe.difficulty ? (
            <Chip className="capitalize">
              <Gauge />
              {recipe.difficulty.toLowerCase()}
            </Chip>
          ) : null}
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener">
              <Chip className="hover:bg-border">
                <ExternalLink />
                {recipe.sourceName ?? 'Source'}
              </Chip>
            </a>
          ) : recipe.sourceName ? (
            <Chip>{recipe.sourceName}</Chip>
          ) : null}

          {recipe.steps.length > 0 && (
            <Button variant="primary" size="sm" className="ml-auto" onClick={() => setCooking(true)}>
              <ChefHat />
              Cook Mode
            </Button>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
          <IngredientPanel
            ingredients={recipe.ingredients}
            servings={servings}
            baseServings={recipe.baseServings}
            servingUnit={recipe.servingUnit}
            factor={factor}
            onServingsChange={setServings}
            checked={checked}
            onToggle={toggleIngredient}
          />

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</h2>
            <ol className="space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {step.title && <p className="font-semibold">{step.title}</p>}
                    <p className="leading-relaxed">{step.instruction}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My notes</h2>
          <Textarea
            rows={3}
            placeholder="What you changed, what to do differently next time…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => notes !== (recipe.personalNotes ?? '') && saveNotes.mutate({ id: recipe.id, notes })}
          />
        </section>

        <div className="mt-10 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (!window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
              deleteRecipe.mutate(recipe.id, { onSuccess: () => navigate('/recipes') });
            }}
          >
            <Trash2 />
            Delete recipe
          </Button>
        </div>      </div>

      {cooking && (
        <CookMode
          recipe={recipe}
          servings={servings}
          baseServings={recipe.baseServings}
          factor={factor}
          onServingsChange={setServings}
          checked={checked}
          onToggleIngredient={toggleIngredient}
          onClose={() => setCooking(false)}
        />
      )}
    </article>
  );
}
