export type Role = 'USER' | 'ADMIN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SourceType = 'VIDEO' | 'WEB' | 'BOOK' | 'ORIGINAL';
export type ThemeId = 'fresh' | 'editorial' | 'minimal';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: number;
  username: string;
  email?: string | null;
  displayName?: string | null;
  role: Role;
  themeId: ThemeId;
  themeMode: ThemeMode;
  enabled: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  expiresInSeconds: number;
  user: User;
}

export interface TagRef {
  id: number;
  name: string;
  slug: string;
}

export interface Tag extends TagRef {
  colorToken?: string | null;
  coverImageKey?: string | null;
  recipeCount: number;
}

export interface Ingredient {
  id: number;
  sortOrder: number;
  section?: string | null;
  refKey?: string | null;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  canonicalUnit?: string | null;
  name: string;
  note?: string | null;
  rawText?: string | null;
  scalable: boolean;
  optional: boolean;
}

export interface Step {
  id: number;
  sortOrder: number;
  section?: string | null;
  title?: string | null;
  instruction: string;
  durationSeconds: number | null;
  temperatureC: number | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  usedIngredientIds: number[];
}

export interface RecipeSummary {
  id: number;
  title: string;
  sourceName?: string | null;
  sourceType?: SourceType | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  totalMinutes: number | null;
  difficulty: Difficulty | null;
  favorite: boolean;
  ingredientCount: number;
  tags: TagRef[];
  updatedAt: string;
}

export interface RecipeDetail extends Omit<RecipeSummary, 'ingredientCount'> {
  description?: string | null;
  sourceUrl?: string | null;
  baseServings: number | null;
  servingUnit?: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  personalNotes?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ImportPreviewItem {
  index: number;
  recipe: RecipeUpsert;
  warnings: string[];
}

export interface ImportPreview {
  recipeCount: number;
  items: ImportPreviewItem[];
}

export interface RecipeUpsert {
  title: string;
  description?: string | null;
  source?: { url?: string | null; name?: string | null; type?: SourceType | null } | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  servings?: { amount: number | null; unit?: string | null } | null;
  times?: { prepMinutes?: number | null; cookMinutes?: number | null; totalMinutes?: number | null } | null;
  difficulty?: Difficulty | null;
  favorite?: boolean | null;
  notes?: string | null;
  tags?: string[];
  ingredients?: Array<{
    ref?: string | null;
    section?: string | null;
    quantity?: number | null;
    quantityMax?: number | null;
    unit?: string | null;
    name: string;
    note?: string | null;
    rawText?: string | null;
    scalable?: boolean | null;
    optional?: boolean | null;
  }>;
  steps?: Array<{
    section?: string | null;
    title?: string | null;
    instruction: string;
    durationSeconds?: number | null;
    temperatureC?: number | null;
    imageUrl?: string | null;
    uses?: string[];
  }>;
  importPayload?: string | null;
}

/** The schema text is absent in the history index, which carries metadata only. */
export interface TemplateVersion {
  versionNo: number;
  schema?: string | null;
  example?: string | null;
  changelog?: string | null;
  createdAt: string;
}

export interface TemplateSummary {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  currentVersionNo: number;
  builtin: boolean;
  archived: boolean;
  versionCount: number;
  updatedAt: string;
}

export interface Template extends Omit<TemplateSummary, 'versionCount'> {
  version: TemplateVersion;
  versions: TemplateVersion[];
}
