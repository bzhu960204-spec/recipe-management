const GLYPHS: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

const DENOMINATORS = [2, 3, 4, 5, 6, 8];
const TOLERANCE = 0.012;

/**
 * Renders an amount the way a recipe would write it: 0.5 becomes ½, 1.5 becomes 1½.
 * Falls back to a trimmed decimal when no common fraction is close enough.
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  if (value === 0) return '0';

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const remainder = abs - whole;

  if (remainder < TOLERANCE) return `${sign}${whole}`;

  for (const denominator of DENOMINATORS) {
    const numerator = Math.round(remainder * denominator);
    if (numerator === 0 || numerator >= denominator) continue;
    if (Math.abs(remainder - numerator / denominator) > TOLERANCE) continue;

    const glyph = GLYPHS[`${numerator}/${denominator}`];
    const fraction = glyph ?? `${numerator}/${denominator}`;
    return whole === 0 ? `${sign}${fraction}` : `${sign}${whole}${glyph ? '' : ' '}${fraction}`;
  }

  const rounded = Math.round(abs * 100) / 100;
  return `${sign}${String(rounded)}`;
}

/** Scale factor derived from the serving stepper; guards against a missing or zero base. */
export function scaleFactor(baseServings: number | null | undefined, targetServings: number): number {
  if (!baseServings || baseServings <= 0) return 1;
  return targetServings / baseServings;
}

export interface ScalableAmount {
  quantityMin: number | null | undefined;
  quantityMax: number | null | undefined;
  unit: string | null | undefined;
  scalable: boolean;
}

/**
 * Produces the amount text for one ingredient at the current serving count.
 * Non-scalable entries ("salt to taste") keep their original amount on purpose.
 */
export function formatAmount(amount: ScalableAmount, factor: number): string {
  const applied = amount.scalable ? factor : 1;

  // Loose null checks on purpose: the API omits null fields, so these arrive as undefined.
  const min = amount.quantityMin == null ? null : amount.quantityMin * applied;
  const max = amount.quantityMax == null ? null : amount.quantityMax * applied;

  if (min === null) return '';
  const range = max === null ? formatQuantity(min) : `${formatQuantity(min)}–${formatQuantity(max)}`;
  return amount.unit ? `${range} ${amount.unit}` : range;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  return formatDuration(minutes ? minutes * 60 : null);
}
