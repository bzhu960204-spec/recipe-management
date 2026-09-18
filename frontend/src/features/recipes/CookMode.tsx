import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListChecks, Thermometer, Timer, X, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/primitives';
import { formatAmount, formatDuration } from '@/lib/quantity';
import { cn } from '@/lib/utils';
import type { Ingredient, RecipeDetail } from '@/lib/types';
import { IngredientPanel } from './IngredientPanel';
import { useWakeLock } from './useWakeLock';

interface Props {
  recipe: RecipeDetail;
  servings: number;
  baseServings: number | null;
  factor: number;
  onServingsChange: (value: number) => void;
  checked: Set<number>;
  onToggleIngredient: (id: number) => void;
  onClose: () => void;
}

/**
 * Cooking context: steps at arm's length, scrollable so the whole method stays scannable,
 * with the current step highlighted and its ingredient amounts inlined at the current scale.
 */
export function CookMode({
  recipe,
  servings,
  baseServings,
  factor,
  onServingsChange,
  checked,
  onToggleIngredient,
  onClose,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [showIngredients, setShowIngredients] = useState(false);
  const { supported, held } = useWakeLock(true);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  const ingredientsById = useMemo(
    () => new Map(recipe.ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [recipe.ingredients],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') setCurrentStep((step) => Math.min(step + 1, recipe.steps.length - 1));
      if (event.key === 'ArrowUp') setCurrentStep((step) => Math.max(step - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, recipe.steps.length]);

  useEffect(() => {
    stepRefs.current[currentStep]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep]);

  function toggleDone(index: number) {
    setDoneSteps((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    if (index === currentStep && index < recipe.steps.length - 1) setCurrentStep(index + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{recipe.title}</h1>
          <p className="text-xs text-muted-foreground">
            Step {Math.min(currentStep + 1, recipe.steps.length)} of {recipe.steps.length}
            {baseServings ? ` · serves ${servings}` : ''}
          </p>
        </div>

        <Chip title={supported ? 'Screen stays awake while cooking' : 'This browser cannot keep the screen awake'}>
          {held ? <Zap /> : <ZapOff />}
          {held ? 'Awake' : supported ? 'Idle' : 'Unsupported'}
        </Chip>

        <Button variant="outline" size="sm" onClick={() => setShowIngredients((open) => !open)}>
          <ListChecks />
          <span className="hidden sm:inline">Ingredients</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Exit cook mode" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <ol className="min-w-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-8">
          {recipe.steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isDone = doneSteps.has(index);
            const used = step.usedIngredientIds
              .map((id) => ingredientsById.get(id))
              .filter((value): value is Ingredient => Boolean(value));

            return (
              <li
                key={step.id}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'mx-auto mb-3 max-w-3xl cursor-pointer rounded-[var(--radius-card)] border p-4 transition-colors sm:p-5',
                  isCurrent ? 'border-primary bg-accent' : 'border-transparent bg-card',
                  isDone && !isCurrent && 'opacity-45',
                )}
              >
                {step.section && (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {step.section}
                  </p>
                )}

                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={isDone ? 'Mark step as not done' : 'Mark step as done'}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleDone(index);
                    }}
                    className={cn(
                      'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold',
                      isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface-raised',
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : index + 1}
                  </button>

                  <div className="min-w-0 flex-1">
                    {step.title && <p className="mb-1 font-semibold">{step.title}</p>}
                    <p className={cn('cook-mode-text', isDone && 'line-through')}>{step.instruction}</p>

                    {(used.length > 0 || step.durationSeconds || step.temperatureC) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {used.map((ingredient) => (
                          <Chip key={ingredient.id} className="bg-surface-raised">
                            <span className="font-semibold tabular-nums">{formatAmount(ingredient, factor)}</span>
                            {ingredient.name}
                          </Chip>
                        ))}
                        {step.durationSeconds ? (
                          <Chip>
                            <Timer />
                            {formatDuration(step.durationSeconds)}
                          </Chip>
                        ) : null}
                        {step.temperatureC ? (
                          <Chip>
                            <Thermometer />
                            {Math.round(step.temperatureC)}°C
                          </Chip>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {showIngredients && (
          <aside className="w-[320px] shrink-0 overflow-y-auto scrollbar-thin border-l border-border bg-card p-4">
            <IngredientPanel
              compact
              ingredients={recipe.ingredients}
              servings={servings}
              baseServings={baseServings}
              servingUnit={recipe.servingUnit}
              factor={factor}
              onServingsChange={onServingsChange}
              checked={checked}
              onToggle={onToggleIngredient}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
