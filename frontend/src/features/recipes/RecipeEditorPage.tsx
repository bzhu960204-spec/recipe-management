import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { detailToUpsert, emptyRecipeUpsert } from '@/lib/recipeUpsert';
import type { RecipeUpsert } from '@/lib/types';
import { RecipeForm } from './RecipeForm';
import { useCreateRecipe, useRecipe, useUpdateRecipe } from './queries';

export function RecipeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const recipeId = id ? Number(id) : undefined;
  const { data: recipe, isLoading } = useRecipe(recipeId);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();

  const mutation = recipeId === undefined ? create : update;
  const error = mutation.error instanceof ApiError ? mutation.error.message : null;

  function save(next: RecipeUpsert) {
    if (recipeId === undefined) {
      create.mutate(next, { onSuccess: (saved) => navigate(`/recipes/${saved.id}`) });
    } else {
      update.mutate({ id: recipeId, recipe: next }, { onSuccess: () => navigate(`/recipes/${recipeId}`) });
    }
  }

  async function autoSave(next: RecipeUpsert) {
    if (recipeId === undefined) return;
    await update.mutateAsync({ id: recipeId, recipe: next });
  }

  if (recipeId !== undefined && (isLoading || !recipe)) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back"
            onClick={() => navigate(recipeId === undefined ? '/recipes' : `/recipes/${recipeId}`)}
          >
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold">{recipe ? `Edit ${recipe.title}` : 'New recipe'}</h1>
        </div>

        <RecipeForm
          initial={recipe ? detailToUpsert(recipe) : emptyRecipeUpsert()}
          submitLabel={recipe ? 'Save changes' : 'Create recipe'}
          pending={mutation.isPending}
          error={error}
          onSubmit={save}
          onAutoSave={recipeId === undefined ? undefined : autoSave}
          onCancel={() => navigate(recipeId === undefined ? '/recipes' : `/recipes/${recipeId}`)}
        />
      </div>
    </div>
  );
}
