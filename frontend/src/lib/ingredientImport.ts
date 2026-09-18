/**
 * Parses the flat ingredient format (see backend prompt-templates/ingredient-flat/format.md)
 * into rows the recipe editor can append. Everything here is pure so it can be unit tested.
 */

export interface ParsedIngredient {
  section: string;
  quantity: string;
  quantityMax: string;
  unit: string;
  name: string;
  note: string;
  optional: boolean;
}

const GLYPH_VALUE: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const GLYPH = '[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]';
// A single amount value: mixed "1 1/2", fraction "1/2", "1½", a bare glyph, or a decimal.
const NUM = `(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+${GLYPH}|${GLYPH}|\\d+(?:\\.\\d+)?)`;
const RANGE_SEP = '\\s*(?:[-~～]|到|至)\\s*';
const AMOUNT_RE = new RegExp(`(?:${NUM}${RANGE_SEP}${NUM}|${NUM})`, 'g');
const RANGE_SPLIT_RE = /\s*(?:[-~～]|到|至)\s*/;

// Longest first so "小勺" wins over "勺" and "kg" over "g" in the alternation.
const UNITS = [
  'kg', 'mg', 'ml', 'g', 'l',
  'tbsp.', 'tbsp', 'tsp.', 'tsp', 'cups', 'cup', 'oz', 'lbs', 'lb', 'pt', 'qt', 'gal',
  'cloves', 'clove', 'slices', 'slice', 'pieces', 'piece', 'cans', 'can',
  'sticks', 'stick', 'stalks', 'stalk', 'sprigs', 'sprig', 'bunches', 'bunch',
  'pinch', 'dash', 'handful',
  '千克', '公斤', '毫升', '毫克', '克', '升', '斤', '两',
  '大勺', '小勺', '大匙', '小匙', '汤匙', '茶匙', '匙', '勺', '杯', '碗',
  '個', '个', '只', '隻', '片', '根', '瓣', '颗', '顆', '块', '塊', '张', '張',
  '条', '條', '段', '撮', '滴', '把', '包', '袋', '盒', '罐', '棵', '枝', '朵', '粒', '份',
];

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const UNIT_PREFIX_RE = new RegExp(
  `^(${[...UNITS].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})(?![A-Za-z])`,
  'i',
);

function numValue(token: string): number {
  const value = token.trim();
  let match = /^(\d+)\s+(\d+)\/(\d+)$/.exec(value);
  if (match) return Number(match[1]) + Number(match[2]) / Number(match[3]);
  match = new RegExp(`^(\\d+)(${GLYPH})$`).exec(value);
  if (match) return Number(match[1]) + GLYPH_VALUE[match[2]];
  match = /^(\d+)\/(\d+)$/.exec(value);
  if (match) return Number(match[1]) / Number(match[2]);
  if (GLYPH_VALUE[value] != null) return GLYPH_VALUE[value];
  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal : NaN;
}

/** Trims floating-point noise (1/3 → "0.3333") without touching exact values like 0.5. */
function toAmount(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(Number(value.toFixed(4)));
}

function parseAmount(raw: string): { min: string; max: string } {
  const parts = raw.split(RANGE_SPLIT_RE).filter((part) => part !== '');
  const min = toAmount(numValue(parts[0]));
  const max = parts.length > 1 ? toAmount(numValue(parts[1])) : '';
  return { min, max };
}

function splitUnitName(post: string): { unit: string; name: string } {
  const text = post.trim();
  const match = UNIT_PREFIX_RE.exec(text);
  if (match) {
    return { unit: match[0], name: text.slice(match[0].length).trim() };
  }
  return { unit: '', name: text };
}

function parseLine(line: string, section: string): ParsedIngredient | null {
  let core = line;
  let note = '';
  let optional = false;

  const noteMatch = /[(（]([^()（）]*)[)）]/.exec(core);
  if (noteMatch) {
    note = noteMatch[1].trim();
    core = (core.slice(0, noteMatch.index) + core.slice(noteMatch.index + noteMatch[0].length)).trim();
  }

  if (/[?？]\s*$/.test(core)) {
    optional = true;
    core = core.replace(/[?？]\s*$/, '').trim();
  }

  core = core.trim();
  if (!core) return null;

  let quantity = '';
  let quantityMax = '';
  let unit = '';
  let name = core;

  const matches = [...core.matchAll(AMOUNT_RE)];
  if (matches.length > 0) {
    const first = matches[0];
    if (first.index === 0) {
      const amount = parseAmount(first[0]);
      quantity = amount.min;
      quantityMax = amount.max;
      const split = splitUnitName(core.slice(first[0].length));
      unit = split.unit;
      name = split.name;
    } else {
      const last = matches[matches.length - 1];
      const amount = parseAmount(last[0]);
      quantity = amount.min;
      quantityMax = amount.max;
      unit = core.slice(last.index! + last[0].length).trim();
      name = core.slice(0, last.index).trim();
    }
  }

  name = name.trim();
  if (!name) {
    // An amount with no name left over (e.g. a stray "500g"): keep the raw text as the name.
    return { section, quantity: '', quantityMax: '', unit: '', name: core, note, optional };
  }

  return { section, quantity, quantityMax, unit, name, note, optional };
}

export function parseIngredientImport(text: string): ParsedIngredient[] {
  const rows: ParsedIngredient[] = [];
  let section = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      section = line.replace(/^#+/, '').trim();
      continue;
    }
    if (/^【.*】$/.test(line)) {
      section = line.slice(1, -1).trim();
      continue;
    }

    const parsed = parseLine(line, section);
    if (parsed) rows.push(parsed);
  }

  return rows;
}
