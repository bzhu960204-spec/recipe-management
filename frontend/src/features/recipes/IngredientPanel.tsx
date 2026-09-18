import { useMemo, useState } from 'react';
import { Check, Copy, Minus, Plus } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/primitives';
import { formatAmount } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/lib/types';

interface Props {
  ingredients: Ingredient[];
  servings: number;
  baseServings: number | null;
  servingUnit?: string | null;
  factor: number;
  onServingsChange: (value: number) => void;
  checked: Set<number>;
  onToggle: (id: number) => void;
  compact?: boolean;
}

const MULTIPLIERS = [
  { label: '×½', value: 0.5 },
  { label: '×1', value: 1 },
  { label: '×2', value: 2 },
];

/**
 * Shopping context: amounts first, grouped by section, tickable.
 * Optional items are separated out so a shopping trip is not padded with maybes.
 */
export function IngredientPanel({
  ingredients,
  servings,
  baseServings,
  servingUnit,
  factor,
  onServingsChange,
  checked,
  onToggle,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => {
    const grouped = new Map<string, Ingredient[]>();
    ingredients.forEach((ingredient) => {
      const key = ingredient.section ?? '';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ingredient);
    });
    return [...grouped.entries()];
  }, [ingredients]);

  async function copyAll() {
    const lines = ingredients.map((ingredient) => {
      const amount = formatAmount(ingredient, factor);
      return [amount, ingredient.name, ingredient.note ? `(${ingredient.note})` : '']
        .filter(Boolean)
        .join(' ')
        .trim();
    });
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn('font-semibold', compact ? 'text-sm' : 'text-xs uppercase tracking-wider text-muted-foreground')}>
          Ingredients
        </h2>
        {!compact && (
          <Button variant="ghost" size="sm" onClick={copyAll} title="Copy the scaled list">
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </header>

      {baseServings !== null && baseServings > 0 && (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-border bg-surface-raised p-1.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fewer servings"
              disabled={servings <= 1}
              onClick={() => onServingsChange(servings - 1)}
            >
              <Minus />
            </Button>
            <span className="flex-1 text-center text-sm font-medium">
              Serves {servings}
              {servingUnit && servingUnit !== 'servings' ? ` ${servingUnit}` : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More servings"
              disabled={servings >= 99}
              onClick={() => onServingsChange(servings + 1)}
            >
              <Plus />
            </Button>
          </div>

          {/* Stepping one serving at a time off a large base gives amounts no kitchen can measure. */}
          <div className="flex gap-1 px-1 pb-0.5">
            {MULTIPLIERS.map((multiplier) => {
              const target = Math.min(99, Math.max(1, Math.round(baseServings * multiplier.value)));
              return (
                <Button
                  key={multiplier.label}
                  variant={servings === target ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                  aria-label={`Scale to ${multiplier.label} of ${baseServings}`}
                  onClick={() => onServingsChange(target)}
                >
                  {multiplier.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <ul className="divide-y divide-border">
        {sections.map(([section, items]) => (
          <li key={section || 'default'} className="py-1">
            {section && (
              <p className="px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section}
              </p>
            )}
            <ul>
              {items.map((ingredient) => (
                <IngredientRow
                  key={ingredient.id}
                  ingredient={ingredient}
                  factor={factor}
                  checked={checked.has(ingredient.id)}
                  onToggle={() => onToggle(ingredient.id)}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IngredientRow({
  ingredient,
  factor,
  checked,
  onToggle,
}: {
  ingredient: Ingredient;
  factor: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const amount = formatAmount(ingredient, factor);

  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] px-1 py-2 transition-colors hover:bg-muted',
          checked && 'opacity-45',
        )}
      >
        <Checkbox.Root
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[4px] border border-border bg-input data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        >
          <Checkbox.Indicator>
            <Check className="size-3.5 text-primary-foreground" />
          </Checkbox.Indicator>
        </Checkbox.Root>

        <span className={cn('min-w-0 flex-1 text-sm leading-snug', checked && 'line-through')}>
          {amount && <span className="font-semibold tabular-nums">{amount} </span>}
          <span>{ingredient.name}</span>
          {ingredient.note && <span className="text-muted-foreground">, {ingredient.note}</span>}
          {ingredient.optional && (
            <Chip className="ml-2 align-middle text-[10px]">optional</Chip>
          )}
          {!ingredient.scalable && ingredient.quantityMin !== null && (
            <Chip className="ml-2 align-middle text-[10px]">not scaled</Chip>
          )}
        </span>
      </label>
    </li>
  );
}
