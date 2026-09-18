/**
 * Parses per-section recipe JSON (Basics / Ingredients / Method) into the write shape the
 * editor merges into its draft. The schemas these mirror ship as built-in templates
 * (prompt-templates/recipe-basics, recipe-ingredients, recipe-method). Everything here is pure
 * so it can be unit tested; each parser throws a human-readable Error on bad input.
 */
import type { Difficulty, RecipeUpsert, SourceType } from './types';

export type ImportMode = 'import' | 'update';

export type BasicsPayload = Pick<
  RecipeUpsert,
  'title' | 'description' | 'source' | 'imageUrl' | 'servings' | 'times' | 'difficulty' | 'favorite' | 'tags'
>;
export type IngredientPayload = NonNullable<RecipeUpsert['ingredients']>[number];
export type StepPayload = NonNullable<RecipeUpsert['steps']>[number];

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const SOURCE_TYPES: SourceType[] = ['VIDEO', 'WEB', 'BOOK', 'ORIGINAL'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  throw new Error(`"${field}" must be text.`);
}

function optString(value: unknown, field: string): string | null {
  if (value == null) return null;
  return asString(value, field);
}

/** Accepts a JSON number or a numeric string; blank/omitted becomes null. */
function optNumber(value: unknown, field: string): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`"${field}" must be a number.`);
  return parsed;
}

function optBool(value: unknown, field: string): boolean | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  throw new Error(`"${field}" must be true or false.`);
}

function optEnum<T extends string>(value: unknown, allowed: T[], field: string): T | null {
  if (value == null || value === '') return null;
  const text = asString(value, field);
  const match = allowed.find((entry) => entry === text);
  if (!match) throw new Error(`"${field}" must be one of: ${allowed.join(', ')}.`);
  return match;
}

/** Unwraps a bare array or a { [key]: array } envelope into the array. */
function asItemArray(parsed: unknown, key: 'ingredients' | 'steps'): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (isObject(parsed) && Array.isArray(parsed[key])) return parsed[key] as unknown[];
  throw new Error(`Expected a JSON array of ${key}, or an object with an "${key}" array.`);
}

export function parseBasics(parsed: unknown): BasicsPayload {
  if (!isObject(parsed)) throw new Error('Expected a JSON object for the Basics block.');

  const result: BasicsPayload = {} as BasicsPayload;
  if ('title' in parsed) result.title = asString(parsed.title, 'title').trim();
  if ('description' in parsed) result.description = optString(parsed.description, 'description');
  if ('imageUrl' in parsed) result.imageUrl = optString(parsed.imageUrl, 'imageUrl');
  if ('difficulty' in parsed) result.difficulty = optEnum(parsed.difficulty, DIFFICULTIES, 'difficulty');
  if ('favorite' in parsed) result.favorite = optBool(parsed.favorite, 'favorite');

  if ('source' in parsed) {
    const source = parsed.source;
    if (source == null) {
      result.source = null;
    } else if (isObject(source)) {
      result.source = {
        name: optString(source.name, 'source.name'),
        url: optString(source.url, 'source.url'),
        type: optEnum(source.type, SOURCE_TYPES, 'source.type'),
      };
    } else {
      throw new Error('"source" must be an object.');
    }
  }

  if ('servings' in parsed) {
    const servings = parsed.servings;
    if (servings == null) {
      result.servings = null;
    } else if (isObject(servings)) {
      result.servings = {
        amount: optNumber(servings.amount, 'servings.amount'),
        unit: optString(servings.unit, 'servings.unit'),
      };
    } else {
      throw new Error('"servings" must be an object.');
    }
  }

  if ('times' in parsed) {
    const times = parsed.times;
    if (times == null) {
      result.times = null;
    } else if (isObject(times)) {
      result.times = {
        prepMinutes: optNumber(times.prepMinutes, 'times.prepMinutes'),
        cookMinutes: optNumber(times.cookMinutes, 'times.cookMinutes'),
        totalMinutes: optNumber(times.totalMinutes, 'times.totalMinutes'),
      };
    } else {
      throw new Error('"times" must be an object.');
    }
  }

  if ('tags' in parsed) {
    const tags = parsed.tags;
    if (tags == null) {
      result.tags = [];
    } else if (Array.isArray(tags)) {
      result.tags = tags.map((tag, index) => asString(tag, `tags[${index}]`).trim()).filter(Boolean);
    } else {
      throw new Error('"tags" must be an array of text.');
    }
  }

  return result;
}

export function parseIngredients(parsed: unknown): IngredientPayload[] {
  const items = asItemArray(parsed, 'ingredients');
  return items.map((raw, index) => {
    if (!isObject(raw)) throw new Error(`Ingredient ${index + 1} must be an object.`);
    const name = asString(raw.name, `ingredients[${index}].name`).trim();
    if (!name) throw new Error(`Ingredient ${index + 1} needs a "name".`);
    return {
      ref: optString(raw.ref, `ingredients[${index}].ref`),
      name,
      quantity: optNumber(raw.quantity, `ingredients[${index}].quantity`),
      quantityMax: optNumber(raw.quantityMax, `ingredients[${index}].quantityMax`),
      unit: optString(raw.unit, `ingredients[${index}].unit`),
      note: optString(raw.note, `ingredients[${index}].note`),
      section: optString(raw.section, `ingredients[${index}].section`),
      optional: optBool(raw.optional, `ingredients[${index}].optional`) ?? false,
      scalable: optBool(raw.scalable, `ingredients[${index}].scalable`) ?? undefined,
      rawText: optString(raw.rawText, `ingredients[${index}].rawText`),
    };
  });
}

export function parseSteps(parsed: unknown): StepPayload[] {
  const items = asItemArray(parsed, 'steps');
  return items.map((raw, index) => {
    if (!isObject(raw)) throw new Error(`Step ${index + 1} must be an object.`);
    const instruction = asString(raw.instruction, `steps[${index}].instruction`).trim();
    if (!instruction) throw new Error(`Step ${index + 1} needs an "instruction".`);
    let uses: string[] = [];
    if (raw.uses != null) {
      if (!Array.isArray(raw.uses)) throw new Error(`"steps[${index}].uses" must be an array.`);
      uses = raw.uses.map((use, useIndex) => asString(use, `steps[${index}].uses[${useIndex}]`));
    }
    return {
      instruction,
      title: optString(raw.title, `steps[${index}].title`),
      section: optString(raw.section, `steps[${index}].section`),
      durationSeconds: optNumber(raw.durationSeconds, `steps[${index}].durationSeconds`),
      temperatureC: optNumber(raw.temperatureC, `steps[${index}].temperatureC`),
      uses,
    };
  });
}
