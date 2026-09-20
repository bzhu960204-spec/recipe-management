import { api } from '@/lib/api';
import { detailToUpsert } from '@/lib/recipeUpsert';
import type { RecipeDetail, RecipeUpsert } from '@/lib/types';

const EXPORT_FORMAT = 'kitchen-ledger/recipes';
const EXPORT_VERSION = 1;

export interface RecipeExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  recipes: RecipeUpsert[];
}

/** Uploaded photos live behind an account-scoped key another library can't serve, so drop it. */
function toExportRecipe(detail: RecipeDetail): RecipeUpsert {
  const upsert = detailToUpsert(detail);
  delete upsert.imageKey;
  return upsert;
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'recipe';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Fetches each recipe's detail, packs them into one JSON file, and downloads it. */
export async function exportRecipes(ids: number[]): Promise<void> {
  const details = await Promise.all(ids.map((id) => api.get<RecipeDetail>(`/api/recipes/${id}`)));
  const file: RecipeExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: details.map(toExportRecipe),
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const filename =
    details.length === 1
      ? `${slugify(details[0].title)}.json`
      : `recipes-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(blob, filename);
}
