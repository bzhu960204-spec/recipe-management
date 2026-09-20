import type { RecipeDetail, RecipeUpsert } from './types';

/**
 * Round-trips a saved recipe back into the write shape.
 * `imageKey` and `notes` must survive the trip: the API replaces both on every PUT,
 * so dropping them here would silently wipe an uploaded photo or the personal notes.
 */
export function detailToUpsert(detail: RecipeDetail): RecipeUpsert {
  const refById = new Map<number, string>();
  detail.ingredients.forEach((ingredient) => {
    refById.set(ingredient.id, ingredient.refKey ?? ingredient.name);
  });

  return {
    title: detail.title,
    description: detail.description ?? null,
    source: {
      url: detail.sourceUrl ?? null,
      name: detail.sourceName ?? null,
      type: detail.sourceType ?? null,
    },
    imageUrl: detail.imageUrl ?? null,
    imageKey: detail.imageKey ?? null,
    servings: { amount: detail.baseServings, unit: detail.servingUnit ?? null },
    times: {
      prepMinutes: detail.prepMinutes,
      cookMinutes: detail.cookMinutes,
      totalMinutes: detail.totalMinutes,
    },
    difficulty: detail.difficulty,
    favorite: detail.favorite,
    notes: detail.personalNotes ?? null,
    category: detail.category?.name ?? null,
    ingredients: detail.ingredients.map((ingredient) => ({
      ref: ingredient.refKey ?? null,
      section: ingredient.section ?? null,
      quantity: ingredient.quantityMin,
      quantityMax: ingredient.quantityMax,
      unit: ingredient.unit,
      name: ingredient.name,
      note: ingredient.note ?? null,
      rawText: ingredient.rawText ?? null,
      scalable: ingredient.scalable,
      optional: ingredient.optional,
    })),
    steps: detail.steps.map((step) => ({
      section: step.section ?? null,
      title: step.title ?? null,
      instruction: step.instruction,
      durationSeconds: step.durationSeconds,
      temperatureC: step.temperatureC,
      imageUrl: step.imageUrl ?? null,
      uses: step.usedIngredientIds
        .map((id) => refById.get(id))
        .filter((ref): ref is string => ref !== undefined),
    })),
  };
}

export function emptyRecipeUpsert(): RecipeUpsert {
  return {
    title: '',
    servings: { amount: 2, unit: null },
    category: null,
    ingredients: [],
    steps: [],
  };
}
