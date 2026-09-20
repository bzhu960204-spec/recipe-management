import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ImportPreview, Page, RecipeDetail, RecipeSummary, RecipeUpsert, Category } from '@/lib/types';

export interface RecipeFilters {
  q?: string;
  category?: string;
  favorite?: boolean;
  difficulty?: string;
  maxMinutes?: number;
  sort?: string;
}

function toQueryString(filters: RecipeFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/api/categories') });
}

export function useRecipes(filters: RecipeFilters) {
  return useQuery({
    queryKey: ['recipes', filters],
    queryFn: () => api.get<Page<RecipeSummary>>(`/api/recipes${toQueryString(filters)}`),
  });
}

/** Pulls every summary matching a filter (up to the server's 200 page cap) for "select all" export. */
export async function fetchAllRecipeSummaries(filters: RecipeFilters): Promise<RecipeSummary[]> {
  const query = toQueryString(filters);
  const separator = query ? '&' : '?';
  const page = await api.get<Page<RecipeSummary>>(`/api/recipes${query}${separator}size=200`);
  return page.content;
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.get<RecipeDetail>(`/api/recipes/${id}`),
    enabled: id !== undefined && !Number.isNaN(id),
  });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      api.put<RecipeDetail>(`/api/recipes/${id}/favorite`, { favorite }),
    onSuccess: (recipe) => {
      client.setQueryData(['recipe', recipe.id], recipe);
      void client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useSaveNotes() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      api.put<RecipeDetail>(`/api/recipes/${id}/notes`, { notes }),
    onSuccess: (recipe) => client.setQueryData(['recipe', recipe.id], recipe),
  });
}

export function useCreateRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (recipe: RecipeUpsert) => api.post<RecipeDetail>('/api/recipes', recipe),
    onSuccess: (recipe) => {
      client.setQueryData(['recipe', recipe.id], recipe);
      void client.invalidateQueries({ queryKey: ['recipes'] });
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recipe }: { id: number; recipe: RecipeUpsert }) =>
      api.put<RecipeDetail>(`/api/recipes/${id}`, recipe),
    onSuccess: (recipe) => {
      client.setQueryData(['recipe', recipe.id], recipe);
      void client.invalidateQueries({ queryKey: ['recipes'] });
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUploadRecipeImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      api.upload<RecipeDetail>(`/api/recipes/${id}/image`, file),
    onSuccess: (recipe) => {
      client.setQueryData(['recipe', recipe.id], recipe);
      void client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useRemoveRecipeImage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<RecipeDetail>(`/api/recipes/${id}/image`),
    onSuccess: (_result, id) => {
      void client.invalidateQueries({ queryKey: ['recipe', id] });
      void client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useRecipeImageFromSource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<RecipeDetail>(`/api/recipes/${id}/image/from-source`),
    onSuccess: (recipe) => {
      client.setQueryData(['recipe', recipe.id], recipe);
      void client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUploadCategoryCover() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => api.upload<Category>(`/api/categories/${id}/cover`, file),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/api/categories/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['categories'] });
      void client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useDeleteRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/api/recipes/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['recipes'] });
      void client.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (payload: unknown) => api.post<ImportPreview>('/api/import/preview', payload),
  });
}

export function useImportPreviewFile() {
  return useMutation({
    mutationFn: (file: File) => api.upload<ImportPreview>('/api/import/preview/file', file),
  });
}

export function useImportCommit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (recipes: RecipeUpsert[]) => api.post<RecipeDetail[]>('/api/import/commit', { recipes }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['recipes'] });
      void client.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
