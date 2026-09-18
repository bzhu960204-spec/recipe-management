import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, ClipboardPaste, FileJson, GripVertical, ListPlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, Chip } from '@/components/ui/primitives';
import { JsonImportDialog } from '@/components/JsonImportDialog';
import { parseIngredientImport } from '@/lib/ingredientImport';
import {
  parseBasics,
  parseIngredients,
  parseSteps,
  type BasicsPayload,
  type ImportMode,
  type IngredientPayload,
  type StepPayload,
} from '@/lib/sectionImport';
import { cn } from '@/lib/utils';
import type { Difficulty, RecipeUpsert, SourceType } from '@/lib/types';
import { useTags } from './queries';

interface IngredientDraft {
  uid: string;
  ref: string | null;
  rawText: string | null;
  section: string;
  quantity: string;
  quantityMax: string;
  unit: string;
  name: string;
  note: string;
  scalable: boolean;
  optional: boolean;
}

interface StepDraft {
  uid: string;
  section: string;
  title: string;
  instruction: string;
  durationMinutes: string;
  temperatureC: string;
  /** Ingredient uids, not refs: a row keeps its link even while its name is being retyped. */
  uses: string[];
}

interface Draft {
  title: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType | '';
  imageUrl: string;
  imageKey: string | null;
  servingsAmount: string;
  servingUnit: string;
  prepMinutes: string;
  cookMinutes: string;
  totalMinutes: string;
  difficulty: Difficulty | '';
  favorite: boolean;
  notes: string;
  tags: string[];
  ingredients: IngredientDraft[];
  steps: StepDraft[];
  importPayload: string | null;
}

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const SOURCE_TYPES: SourceType[] = ['VIDEO', 'WEB', 'BOOK', 'ORIGINAL'];

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `row-${uidCounter}`;
}

function text(value: string | null | undefined): string {
  return value ?? '';
}

function numberText(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function newIngredient(): IngredientDraft {
  return {
    uid: nextUid(),
    ref: null,
    rawText: null,
    section: '',
    quantity: '',
    quantityMax: '',
    unit: '',
    name: '',
    note: '',
    scalable: true,
    optional: false,
  };
}

function newStep(): StepDraft {
  return {
    uid: nextUid(),
    section: '',
    title: '',
    instruction: '',
    durationMinutes: '',
    temperatureC: '',
    uses: [],
  };
}

function toDraft(value: RecipeUpsert): Draft {
  const ingredients: IngredientDraft[] = (value.ingredients ?? []).map((ingredient) => ({
    uid: nextUid(),
    ref: ingredient.ref ?? null,
    rawText: ingredient.rawText ?? null,
    section: text(ingredient.section),
    quantity: numberText(ingredient.quantity),
    quantityMax: numberText(ingredient.quantityMax),
    unit: text(ingredient.unit),
    name: ingredient.name,
    note: text(ingredient.note),
    scalable: ingredient.scalable ?? ingredient.quantity != null,
    optional: ingredient.optional ?? false,
  }));

  // Steps arrive referencing ingredients by ref or by name; resolve both to the draft uid.
  const uidByKey = new Map<string, string>();
  ingredients.forEach((ingredient) => {
    if (ingredient.ref) uidByKey.set(ingredient.ref.toLowerCase(), ingredient.uid);
    if (ingredient.name) uidByKey.set(ingredient.name.toLowerCase(), ingredient.uid);
  });

  return {
    title: value.title ?? '',
    description: text(value.description),
    sourceName: text(value.source?.name),
    sourceUrl: text(value.source?.url),
    sourceType: value.source?.type ?? '',
    imageUrl: text(value.imageUrl),
    imageKey: value.imageKey ?? null,
    servingsAmount: numberText(value.servings?.amount),
    servingUnit: text(value.servings?.unit),
    prepMinutes: numberText(value.times?.prepMinutes),
    cookMinutes: numberText(value.times?.cookMinutes),
    totalMinutes: numberText(value.times?.totalMinutes),
    difficulty: value.difficulty ?? '',
    favorite: value.favorite ?? false,
    notes: text(value.notes),
    tags: value.tags ?? [],
    ingredients,
    steps: (value.steps ?? []).map((step) => ({
      uid: nextUid(),
      section: text(step.section),
      title: text(step.title),
      instruction: step.instruction,
      durationMinutes: step.durationSeconds == null ? '' : String(Math.round(step.durationSeconds / 60)),
      temperatureC: numberText(step.temperatureC),
      uses: (step.uses ?? [])
        .map((reference) => uidByKey.get(reference.toLowerCase()))
        .filter((uid): uid is string => uid !== undefined),
    })),
    importPayload: value.importPayload ?? null,
  };
}

function toUpsert(draft: Draft): RecipeUpsert {
  const ingredients = draft.ingredients.filter((ingredient) => ingredient.name.trim() !== '');
  const refByUid = new Map<string, string>();
  ingredients.forEach((ingredient) => {
    refByUid.set(ingredient.uid, ingredient.ref?.trim() || ingredient.name.trim());
  });

  return {
    title: draft.title.trim(),
    description: blankToNull(draft.description),
    source: {
      name: blankToNull(draft.sourceName),
      url: blankToNull(draft.sourceUrl),
      type: draft.sourceType === '' ? null : draft.sourceType,
    },
    imageUrl: blankToNull(draft.imageUrl),
    imageKey: draft.imageKey,
    servings: { amount: numberOrNull(draft.servingsAmount), unit: blankToNull(draft.servingUnit) },
    times: {
      prepMinutes: numberOrNull(draft.prepMinutes),
      cookMinutes: numberOrNull(draft.cookMinutes),
      totalMinutes: numberOrNull(draft.totalMinutes),
    },
    difficulty: draft.difficulty === '' ? null : draft.difficulty,
    favorite: draft.favorite,
    notes: blankToNull(draft.notes),
    tags: draft.tags,
    ingredients: ingredients.map((ingredient) => ({
      ref: ingredient.ref,
      rawText: ingredient.rawText,
      section: blankToNull(ingredient.section),
      quantity: numberOrNull(ingredient.quantity),
      quantityMax: numberOrNull(ingredient.quantityMax),
      unit: blankToNull(ingredient.unit),
      name: ingredient.name.trim(),
      note: blankToNull(ingredient.note),
      scalable: ingredient.scalable,
      optional: ingredient.optional,
    })),
    steps: draft.steps
      .filter((step) => step.instruction.trim() !== '')
      .map((step) => {
        const minutes = numberOrNull(step.durationMinutes);
        return {
          section: blankToNull(step.section),
          title: blankToNull(step.title),
          instruction: step.instruction.trim(),
          durationSeconds: minutes == null ? null : Math.round(minutes * 60),
          temperatureC: numberOrNull(step.temperatureC),
          uses: step.uses.map((uid) => refByUid.get(uid)).filter((ref): ref is string => ref !== undefined),
        };
      }),
    importPayload: draft.importPayload,
  };
}

/** Turns Basics JSON into draft field patches. Import only touches keys present in the JSON;
 *  Update clears any key the JSON omits. */
function basicsPatch(payload: BasicsPayload, mode: ImportMode): Partial<Draft> {
  const patch: Partial<Draft> = {};
  const has = (key: keyof BasicsPayload) => key in payload;
  if (mode === 'update' || has('title')) patch.title = payload.title ?? '';
  if (mode === 'update' || has('description')) patch.description = text(payload.description);
  if (mode === 'update' || has('imageUrl')) patch.imageUrl = text(payload.imageUrl);
  if (mode === 'update' || has('difficulty')) patch.difficulty = payload.difficulty ?? '';
  if (mode === 'update' || has('favorite')) patch.favorite = payload.favorite ?? false;
  if (mode === 'update' || has('source')) {
    patch.sourceName = text(payload.source?.name);
    patch.sourceUrl = text(payload.source?.url);
    patch.sourceType = payload.source?.type ?? '';
  }
  if (mode === 'update' || has('servings')) {
    patch.servingsAmount = numberText(payload.servings?.amount);
    patch.servingUnit = text(payload.servings?.unit);
  }
  if (mode === 'update' || has('times')) {
    patch.prepMinutes = numberText(payload.times?.prepMinutes);
    patch.cookMinutes = numberText(payload.times?.cookMinutes);
    patch.totalMinutes = numberText(payload.times?.totalMinutes);
  }
  if (mode === 'update' || has('tags')) patch.tags = payload.tags ?? [];
  return patch;
}

function toIngredientDraft(payload: IngredientPayload): IngredientDraft {
  return {
    uid: nextUid(),
    ref: payload.ref ?? null,
    rawText: payload.rawText ?? null,
    section: text(payload.section),
    quantity: numberText(payload.quantity),
    quantityMax: numberText(payload.quantityMax),
    unit: text(payload.unit),
    name: payload.name,
    note: text(payload.note),
    scalable: payload.scalable ?? payload.quantity != null,
    optional: payload.optional ?? false,
  };
}

/** ref (or name, lower-cased) that links a step's `uses` entry to an ingredient row. */
function ingredientKey(row: { ref: string | null; name: string }): string {
  return (row.ref?.trim() || row.name.trim()).toLowerCase();
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function insertAfter<T>(items: T[], index: number, item: T): T[] {
  const next = [...items];
  next.splice(index + 1, 0, item);
  return next;
}

interface IngredientGroup {
  key: string;
  rows: IngredientDraft[];
}

/** Groups rows by their section value; group order follows first appearance. */
function groupIngredients(ingredients: IngredientDraft[]): IngredientGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, IngredientDraft[]>();
  for (const row of ingredients) {
    const existing = byKey.get(row.section);
    if (existing) {
      existing.push(row);
    } else {
      byKey.set(row.section, [row]);
      order.push(row.section);
    }
  }
  return order.map((key) => ({ key, rows: byKey.get(key)! }));
}

/**
 * Drag-and-drop resolution: relocate the dragged row (activeId) to wherever it was
 * dropped (overId is either another row's uid or a "group:<key>" container id).
 * The row inherits the destination section; emptied groups are dropped so they vanish.
 */
function moveRowBetweenGroups(groups: IngredientGroup[], activeId: string, overId: string): IngredientGroup[] {
  const next = groups.map((group) => ({ ...group, rows: [...group.rows] }));

  let fromGroup: IngredientGroup | undefined;
  let fromIndex = -1;
  for (const group of next) {
    const idx = group.rows.findIndex((row) => row.uid === activeId);
    if (idx !== -1) {
      fromGroup = group;
      fromIndex = idx;
      break;
    }
  }
  if (!fromGroup) return groups;

  let toGroup: IngredientGroup | undefined;
  let toIndex = -1;
  if (overId.startsWith('group:')) {
    const key = overId.slice('group:'.length);
    toGroup = next.find((group) => group.key === key);
    if (toGroup) toIndex = toGroup.rows.length;
  } else {
    for (const group of next) {
      const idx = group.rows.findIndex((row) => row.uid === overId);
      if (idx !== -1) {
        toGroup = group;
        toIndex = idx;
        break;
      }
    }
  }
  if (!toGroup || toIndex === -1) return groups;

  const [moved] = fromGroup.rows.splice(fromIndex, 1);
  if (fromGroup === toGroup && fromIndex < toIndex) toIndex -= 1;
  toGroup.rows.splice(toIndex, 0, { ...moved, section: toGroup.key });
  return next.filter((group) => group.rows.length > 0);
}

interface Props {
  initial: RecipeUpsert;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (recipe: RecipeUpsert) => void;
  onCancel: () => void;
  /** When provided (edit mode), the form silently saves on blur without navigating away. */
  onAutoSave?: (recipe: RecipeUpsert) => Promise<void>;
}

type AutoStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * One form serves three jobs: create, edit and correcting an import preview before it is committed.
 * The photo itself is uploaded from the recipe page, because the API needs a saved recipe to attach it to.
 */
type EditorTab = 'basics' | 'ingredients' | 'steps' | 'notes';

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'steps', label: 'Method' },
  { id: 'notes', label: 'Notes' },
];

const JSON_IMPORT_CONFIG: Record<
  'basics' | 'ingredients' | 'steps',
  { title: string; description: string; placeholder: string }
> = {
  basics: {
    title: 'Import basics from JSON',
    description: 'See the "Recipe basics" template for the exact JSON shape.',
    placeholder: '{\n  "title": "Shoyu Chicken",\n  "servings": { "amount": 2, "unit": "servings" },\n  "difficulty": "EASY",\n  "tags": ["chicken"]\n}',
  },
  ingredients: {
    title: 'Import ingredients from JSON',
    description: 'See the "Recipe ingredients" template for the exact JSON shape.',
    placeholder: '[\n  { "ref": "flour", "name": "flour", "quantity": 0.5, "unit": "cup" },\n  { "name": "salt", "note": "to taste" }\n]',
  },
  steps: {
    title: 'Import method from JSON',
    description: 'See the "Recipe method" template for the exact JSON shape.',
    placeholder: '[\n  { "title": "Coat", "instruction": "Dredge in flour.", "uses": ["flour"] },\n  { "instruction": "Fry until golden.", "durationSeconds": 120, "temperatureC": 180 }\n]',
  },
};


export function RecipeForm({ initial, submitLabel, pending = false, error, onSubmit, onCancel, onAutoSave }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [tagInput, setTagInput] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>('basics');
  const [autoStatus, setAutoStatus] = useState<AutoStatus>('idle');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [jsonImport, setJsonImport] = useState<'basics' | 'ingredients' | 'steps' | null>(null);
  const tags = useTags();

  const suggestions = useMemo(
    () => (tags.data ?? []).map((tag) => tag.name).filter((name) => !draft.tags.includes(name)),
    [tags.data, draft.tags],
  );

  const ingredientGroups = useMemo(() => groupIngredients(draft.ingredients), [draft.ingredients]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onAutoSaveRef = useRef(onAutoSave);
  onAutoSaveRef.current = onAutoSave;
  const lastSavedRef = useRef<string>(JSON.stringify(toUpsert(toDraft(initial))));
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  const runAutoSave = useCallback(async () => {
    const save = onAutoSaveRef.current;
    if (!save) return;
    const current = draftRef.current;
    if (!current.title.trim()) return;
    const payload = toUpsert(current);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedRef.current) {
      if (mountedRef.current) setAutoStatus('saved');
      return;
    }
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    savingRef.current = true;
    if (mountedRef.current) setAutoStatus('saving');
    try {
      await save(payload);
      lastSavedRef.current = serialized;
      if (mountedRef.current) setAutoStatus('saved');
    } catch {
      if (mountedRef.current) setAutoStatus('error');
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void runAutoSave();
      }
    }
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (!onAutoSaveRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void runAutoSave(), 500);
  }, [runAutoSave]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      const save = onAutoSaveRef.current;
      const current = draftRef.current;
      if (!save || !current.title.trim()) return;
      const payload = toUpsert(current);
      if (JSON.stringify(payload) !== lastSavedRef.current) {
        void save(payload); // flush unsaved edits on unmount (e.g. Back button)
      }
    };
  }, []);

  function patch(changes: Partial<Draft>) {
    setDraft((previous) => ({ ...previous, ...changes }));
  }

  function patchIngredient(uid: string, changes: Partial<IngredientDraft>) {
    setDraft((previous) => ({
      ...previous,
      ingredients: previous.ingredients.map((row) => (row.uid === uid ? { ...row, ...changes } : row)),
    }));
  }

  function updateIngredientGroups(mutate: (groups: IngredientGroup[]) => IngredientGroup[]) {
    setDraft((previous) => ({
      ...previous,
      ingredients: mutate(groupIngredients(previous.ingredients)).flatMap((group) => group.rows),
    }));
  }

  function addIngredientToSection(key: string) {
    updateIngredientGroups((groups) => {
      const row = { ...newIngredient(), section: key };
      const group = groups.find((entry) => entry.key === key);
      if (group) group.rows = [...group.rows, row];
      else groups.push({ key, rows: [row] });
      return groups;
    });
  }

  function insertIngredientAfter(key: string, index: number) {
    updateIngredientGroups((groups) =>
      groups.map((group) =>
        group.key === key
          ? { ...group, rows: insertAfter(group.rows, index, { ...newIngredient(), section: key }) }
          : group,
      ),
    );
  }

  function handleIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateIngredientGroups((groups) => moveRowBetweenGroups(groups, String(active.id), String(over.id)));
    scheduleAutoSave();
  }

  function moveIngredientSection(from: number, to: number) {
    updateIngredientGroups((groups) => move(groups, from, to));
  }

  function renameIngredientSection(oldKey: string, name: string) {
    setDraft((previous) => ({
      ...previous,
      ingredients: previous.ingredients.map((row) =>
        row.section === oldKey ? { ...row, section: name } : row,
      ),
    }));
  }

  function removeIngredient(uid: string) {
    setDraft((previous) => ({
      ...previous,
      ingredients: previous.ingredients.filter((row) => row.uid !== uid),
      steps: previous.steps.map((step) => ({
        ...step,
        uses: step.uses.filter((used) => used !== uid),
      })),
    }));
  }

  function runIngredientImport() {
    const parsed = parseIngredientImport(importText);
    if (parsed.length === 0) {
      setImportError('No ingredients found — check the format.');
      return;
    }
    updateIngredientGroups((groups) => {
      for (const row of parsed) {
        const draftRow: IngredientDraft = { ...newIngredient(), ...row };
        const group = groups.find((entry) => entry.key === row.section);
        if (group) group.rows = [...group.rows, draftRow];
        else groups.push({ key: row.section, rows: [draftRow] });
      }
      return groups;
    });
    setImportText('');
    setImportError(null);
    setImportOpen(false);
    scheduleAutoSave();
  }

  function applyIngredients(payloads: IngredientPayload[], mode: ImportMode) {
    setDraft((previous) => {
      if (mode === 'update') {
        // Replacing the rows breaks step→ingredient links (they point at uids); rebuild them by key.
        const keyByOldUid = new Map(previous.ingredients.map((row) => [row.uid, ingredientKey(row)]));
        const rows = payloads.map(toIngredientDraft);
        const uidByKey = new Map(rows.map((row) => [ingredientKey(row), row.uid]));
        return {
          ...previous,
          ingredients: rows,
          steps: previous.steps.map((step) => ({
            ...step,
            uses: step.uses
              .map((uid) => keyByOldUid.get(uid))
              .map((key) => (key ? uidByKey.get(key) : undefined))
              .filter((uid): uid is string => uid !== undefined),
          })),
        };
      }
      const rows = previous.ingredients.map((row) => ({ ...row }));
      for (const payload of payloads) {
        const key = ingredientKey({ ref: payload.ref ?? null, name: payload.name });
        const index = rows.findIndex((row) => ingredientKey(row) === key);
        const draftRow = toIngredientDraft(payload);
        if (index === -1) rows.push(draftRow);
        else rows[index] = { ...draftRow, uid: rows[index].uid }; // keep uid so step links survive
      }
      return { ...previous, ingredients: rows };
    });
    scheduleAutoSave();
  }

  function applySteps(payloads: StepPayload[], mode: ImportMode) {
    setDraft((previous) => {
      const uidByKey = new Map(previous.ingredients.map((row) => [ingredientKey(row), row.uid]));
      const mapped: StepDraft[] = payloads.map((payload) => ({
        uid: nextUid(),
        section: text(payload.section),
        title: text(payload.title),
        instruction: payload.instruction,
        durationMinutes:
          payload.durationSeconds == null ? '' : String(Math.round(payload.durationSeconds / 60)),
        temperatureC: numberText(payload.temperatureC),
        uses: (payload.uses ?? [])
          .map((reference) => uidByKey.get(reference.trim().toLowerCase()))
          .filter((uid): uid is string => uid !== undefined),
      }));
      return { ...previous, steps: mode === 'update' ? mapped : [...previous.steps, ...mapped] };
    });
    scheduleAutoSave();
  }

  function handleJsonImport(parsed: unknown, mode: ImportMode): string | null {
    try {
      if (jsonImport === 'basics') {
        patch(basicsPatch(parseBasics(parsed), mode));
        scheduleAutoSave();
      } else if (jsonImport === 'ingredients') {
        applyIngredients(parseIngredients(parsed), mode);
      } else if (jsonImport === 'steps') {
        applySteps(parseSteps(parsed), mode);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not import that JSON.';
    }
  }

  function toggleSection(id: string) {
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function patchStep(uid: string, changes: Partial<StepDraft>) {
    setDraft((previous) => ({
      ...previous,
      steps: previous.steps.map((row) => (row.uid === uid ? { ...row, ...changes } : row)),
    }));
  }

  function handleStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((previous) => {
      const from = previous.steps.findIndex((row) => row.uid === active.id);
      const to = previous.steps.findIndex((row) => row.uid === over.id);
      if (from === -1 || to === -1) return previous;
      return { ...previous, steps: arrayMove(previous.steps, from, to) };
    });
    scheduleAutoSave();
  }

  function addTag(raw: string) {
    const name = raw.trim();
    if (!name || draft.tags.includes(name)) {
      setTagInput('');
      return;
    }
    patch({ tags: [...draft.tags, name] });
    setTagInput('');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setValidation('A title is required.');
      setTab('basics');
      return;
    }
    setValidation(null);
    if (onAutoSave) {
      clearTimeout(timerRef.current);
      void runAutoSave();
    } else {
      onSubmit(toUpsert(draft));
    }
  }

  return (
    <form onSubmit={submit} onBlur={scheduleAutoSave} className="space-y-5">
      {onAutoSave && (
        <div className="sticky top-0 z-20 flex justify-end">
          <AutoSaveIndicator status={autoStatus} invalid={!draft.title.trim()} />
        </div>
      )}
      <div className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-border bg-muted/40 p-1">
        {EDITOR_TABS.map((entry) => {
          const active = tab === entry.id;
          const count =
            entry.id === 'ingredients'
              ? draft.ingredients.length
              : entry.id === 'steps'
                ? draft.steps.length
                : null;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-current={active}
              className={cn(
                'flex-1 whitespace-nowrap rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'basics' && (
      <Card className="space-y-4 p-5">
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setJsonImport('basics')}>
            <FileJson />
            Import JSON
          </Button>
        </div>
        <Field label="Title">
          <Input
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Shoyu Chicken"
            required
          />
        </Field>

        <Field label="Description" hint="One or two lines about what this dish is.">
          <Textarea
            rows={2}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Serves">
            <Input
              type="number"
              min={0}
              step="any"
              value={draft.servingsAmount}
              onChange={(event) => patch({ servingsAmount: event.target.value })}
            />
          </Field>
          <Field label="Serving unit" hint="people, pieces…">
            <Input
              value={draft.servingUnit}
              onChange={(event) => patch({ servingUnit: event.target.value })}
              placeholder="servings"
            />
          </Field>
          <Field label="Difficulty">
            <Select
              value={draft.difficulty}
              onChange={(event) => patch({ difficulty: event.target.value as Difficulty | '' })}
            >
              <option value="">Not set</option>
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0) + level.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Prep (min)">
            <Input
              type="number"
              min={0}
              value={draft.prepMinutes}
              onChange={(event) => patch({ prepMinutes: event.target.value })}
            />
          </Field>
          <Field label="Cook (min)">
            <Input
              type="number"
              min={0}
              value={draft.cookMinutes}
              onChange={(event) => patch({ cookMinutes: event.target.value })}
            />
          </Field>
          <Field label="Total (min)" hint="Left blank, prep + cook is used.">
            <Input
              type="number"
              min={0}
              value={draft.totalMinutes}
              onChange={(event) => patch({ totalMinutes: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {draft.tags.map((tag) => (
              <Chip key={tag} className="pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="grid size-4 place-items-center rounded-full hover:bg-border"
                  onClick={() => patch({ tags: draft.tags.filter((name) => name !== tag) })}
                >
                  <X className="size-3" />
                </button>
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              list="kl-tag-suggestions"
              value={tagInput}
              placeholder="Add a tag and press Enter"
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <datalist id="kl-tag-suggestions">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <Button type="button" variant="outline" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>
              Add
            </Button>
          </div>
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Source name">
            <Input
              value={draft.sourceName}
              onChange={(event) => patch({ sourceName: event.target.value })}
              placeholder="Kenji López-Alt"
            />
          </Field>
          <Field label="Source URL">
            <Input
              type="url"
              value={draft.sourceUrl}
              onChange={(event) => patch({ sourceUrl: event.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Source type">
            <Select
              value={draft.sourceType}
              onChange={(event) => patch({ sourceType: event.target.value as SourceType | '' })}
            >
              <option value="">Not set</option>
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Image URL" hint="An uploaded photo always wins over this link.">
          <Input
            type="url"
            value={draft.imageUrl}
            onChange={(event) => patch({ imageUrl: event.target.value })}
            placeholder="https://…"
          />
        </Field>
      </Card>
      )}

      {tab === 'ingredients' && (
      <Card className="p-5">
        <SectionHeader
          title="Ingredients"
          hint="Leave the amount empty for things like salt to taste."
          onAdd={() => patch({ ingredients: [...draft.ingredients, newIngredient()] })}
          extra={
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => setJsonImport('ingredients')}>
                <FileJson />
                Import JSON
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setImportOpen((open) => !open)}>
                <ClipboardPaste />
                Paste import
              </Button>
            </>
          }
        />

        {importOpen && (
          <Card className="mb-3 space-y-2 border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              One line per ingredient. Start a line with <code className="rounded bg-muted px-1">#</code> for a
              section. The amount can be a fraction or range (<code className="rounded bg-muted px-1">1/2</code>,{' '}
              <code className="rounded bg-muted px-1">1~2</code>); put a note in (parentheses); end a line with{' '}
              <code className="rounded bg-muted px-1">?</code> to mark it optional.
            </p>
            <Textarea
              rows={6}
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportError(null);
              }}
              placeholder={'# Coating\n1/2 cup flour\n1 tsp baking powder\nsalt'}
            />
            {importError && <p className="text-xs text-destructive">{importError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="primary" size="sm" onClick={runIngredientImport} disabled={!importText.trim()}>
                Import
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImportOpen(false);
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {draft.ingredients.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No ingredients yet.</p>
        )}

        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleIngredientDragEnd}
        >
        <div className="space-y-3">
          {ingredientGroups.map((group, groupIndex) => {
            const sectionId = group.rows[0].uid;
            const collapsed = collapsedSections.has(sectionId);
            return (
            <section key={sectionId} className="overflow-hidden rounded-[var(--radius-card)] border border-border">
              <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                  onClick={() => toggleSection(sectionId)}
                >
                  {collapsed ? <ChevronRight /> : <ChevronDown />}
                </Button>
                <Input
                  value={group.key}
                  onChange={(event) => renameIngredientSection(group.key, event.target.value)}
                  placeholder="Ungrouped"
                  className="h-8 flex-1 font-medium sm:max-w-[16rem]"
                />
                <span className="text-xs text-muted-foreground">
                  {group.rows.length} {group.rows.length === 1 ? 'item' : 'items'}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move section up"
                    disabled={groupIndex === 0}
                    onClick={() => moveIngredientSection(groupIndex, groupIndex - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move section down"
                    disabled={groupIndex === ingredientGroups.length - 1}
                    onClick={() => moveIngredientSection(groupIndex, groupIndex + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addIngredientToSection(group.key)}>
                    <Plus />
                    Add
                  </Button>
                </div>
              </header>

              {!collapsed && (
              <SortableContext items={group.rows.map((row) => row.uid)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3 p-3">
                {group.rows.map((ingredient, index) => (
                  <SortableIngredientRow
                    key={ingredient.uid}
                    ingredient={ingredient}
                    onPatch={(changes) => patchIngredient(ingredient.uid, changes)}
                    onInsert={() => insertIngredientAfter(group.key, index)}
                    onRemove={() => removeIngredient(ingredient.uid)}
                  />
                ))}
              </ul>
              </SortableContext>
              )}
            </section>
            );
          })}
        </div>
        </DndContext>
      </Card>
      )}

      {tab === 'steps' && (
      <Card className="p-5">
        <SectionHeader
          title="Method"
          hint="Tick the ingredients a step uses to show their scaled amounts in Cook Mode."
          onAdd={() => patch({ steps: [...draft.steps, newStep()] })}
          extra={
            <Button type="button" variant="ghost" size="sm" onClick={() => setJsonImport('steps')}>
              <FileJson />
              Import JSON
            </Button>
          }
        />

        {draft.steps.length === 0 && <p className="py-4 text-sm text-muted-foreground">No steps yet.</p>}

        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
        <SortableContext items={draft.steps.map((row) => row.uid)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3">
          {draft.steps.map((step, index) => (
            <SortableRow key={step.uid} id={step.uid}>
              {(handle) => (
              <>
              <div className="mb-2 flex items-center gap-2">
                {handle}
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {index + 1}
                </span>
                <Input
                  value={step.title}
                  onChange={(event) => patchStep(step.uid, { title: event.target.value })}
                  placeholder="Optional step title"
                  className="h-9"
                />
              </div>

              <Textarea
                rows={3}
                value={step.instruction}
                onChange={(event) => patchStep(step.uid, { instruction: event.target.value })}
                placeholder="Combine everything and simmer for 20 minutes."
              />

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Field label="Timer (min)" compact>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={step.durationMinutes}
                    onChange={(event) => patchStep(step.uid, { durationMinutes: event.target.value })}
                  />
                </Field>
                <Field label="Temperature (°C)" compact>
                  <Input
                    type="number"
                    step="any"
                    value={step.temperatureC}
                    onChange={(event) => patchStep(step.uid, { temperatureC: event.target.value })}
                  />
                </Field>
                <Field label="Section" compact>
                  <Input
                    value={step.section}
                    onChange={(event) => patchStep(step.uid, { section: event.target.value })}
                  />
                </Field>
              </div>

              {draft.ingredients.some((ingredient) => ingredient.name.trim()) && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Uses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.ingredients
                      .filter((ingredient) => ingredient.name.trim())
                      .map((ingredient) => {
                        const active = step.uses.includes(ingredient.uid);
                        return (
                          <button
                            key={ingredient.uid}
                            type="button"
                            onClick={() =>
                              patchStep(step.uid, {
                                uses: active
                                  ? step.uses.filter((uid) => uid !== ingredient.uid)
                                  : [...step.uses, ingredient.uid],
                              })
                            }
                          >
                            <Chip active={active}>{ingredient.name}</Chip>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="mt-2 flex">
                <RowActions
                  label="step"
                  onInsert={() => patch({ steps: insertAfter(draft.steps, index, newStep()) })}
                  onRemove={() => patch({ steps: draft.steps.filter((row) => row.uid !== step.uid) })}
                />
              </div>
              </>
              )}
            </SortableRow>
          ))}
        </ol>
        </SortableContext>
        </DndContext>
      </Card>
      )}

      {tab === 'notes' && (
      <Card className="p-5">
        <Field label="My notes">
          <Textarea rows={3} value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} />
        </Field>
        <div className="mt-3">
          <Toggle
            label="Favourite"
            checked={draft.favorite}
            onChange={(checked) => patch({ favorite: checked })}
          />
        </div>
      </Card>
      )}

      {(validation || error) && <p className="text-sm text-destructive">{validation ?? error}</p>}

      <div className="flex flex-wrap gap-2 pb-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <JsonImportDialog
        open={jsonImport !== null}
        title={jsonImport ? JSON_IMPORT_CONFIG[jsonImport].title : ''}
        description={jsonImport ? JSON_IMPORT_CONFIG[jsonImport].description : undefined}
        placeholder={jsonImport ? JSON_IMPORT_CONFIG[jsonImport].placeholder : undefined}
        onClose={() => setJsonImport(null)}
        onImport={handleJsonImport}
      />
    </form>
  );
}

function Field({
  label,
  hint,
  compact = false,
  children,
}: {
  label: string;
  hint?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={cn(
          'mb-1 block font-medium text-muted-foreground',
          compact ? 'text-[11px]' : 'text-xs uppercase tracking-wider',
        )}
      >
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function AutoSaveIndicator({ status, invalid }: { status: AutoStatus; invalid: boolean }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur';
  if (invalid) {
    return (
      <span className={cn(base, 'text-amber-600')}>
        <AlertTriangle className="h-3.5 w-3.5" /> Title required — not saved
      </span>
    );
  }
  switch (status) {
    case 'saving':
      return (
        <span className={cn(base, 'text-muted-foreground')}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
        </span>
      );
    case 'saved':
      return (
        <span className={cn(base, 'text-emerald-600')}>
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      );
    case 'error':
      return (
        <span className={cn(base, 'text-destructive')}>
          <AlertTriangle className="h-3.5 w-3.5" /> Save failed — will retry on blur
        </span>
      );
    default:
      return <span className={cn(base, 'text-muted-foreground')}>Autosave on</span>;
  }
}

function SectionHeader({
  title,
  hint,
  onAdd,
  extra,
}: {
  title: string;
  hint: string;
  onAdd: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus />
          Add
        </Button>
      </div>
    </header>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--kl-primary)]"
      />
      {label}
    </label>
  );
}

function RowActions({
  label,
  onInsert,
  onRemove,
}: {
  label: string;
  onInsert?: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
      {onInsert && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Insert ${label} below`}
          title={`Insert ${label} below`}
          onClick={onInsert}
        >
          <ListPlus />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${label}`}
        className="text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

/** Sortable wrapper: renders a draggable <li> and hands the drag handle to its children. */
function SortableRow({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const handle = (
    <button
      type="button"
      className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface-raised p-3',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {children(handle)}
    </li>
  );
}

function SortableIngredientRow({
  ingredient,
  onPatch,
  onInsert,
  onRemove,
}: {
  ingredient: IngredientDraft;
  onPatch: (changes: Partial<IngredientDraft>) => void;
  onInsert: () => void;
  onRemove: () => void;
}) {
  return (
    <SortableRow id={ingredient.uid}>
      {(handle) => (
        <div className="flex gap-2">
          <div className="pt-6">{handle}</div>
          <div className="min-w-0 flex-1">
            <div className="grid gap-2 sm:grid-cols-[5rem_5rem_6rem_1fr]">
              <Field label="Amount" compact>
                <Input
                  type="number"
                  step="any"
                  value={ingredient.quantity}
                  onChange={(event) => onPatch({ quantity: event.target.value })}
                />
              </Field>
              <Field label="to" compact>
                <Input
                  type="number"
                  step="any"
                  value={ingredient.quantityMax}
                  onChange={(event) => onPatch({ quantityMax: event.target.value })}
                />
              </Field>
              <Field label="Unit" compact>
                <Input
                  value={ingredient.unit}
                  onChange={(event) => onPatch({ unit: event.target.value })}
                  placeholder="g"
                />
              </Field>
              <Field label="Name" compact>
                <Input
                  value={ingredient.name}
                  onChange={(event) => onPatch({ name: event.target.value })}
                  placeholder="soy sauce"
                />
              </Field>
            </div>

            <div className="mt-2">
              <Field label="Note" compact>
                <Input
                  value={ingredient.note}
                  onChange={(event) => onPatch({ note: event.target.value })}
                  placeholder="finely chopped"
                />
              </Field>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Toggle
                label="Scales with servings"
                checked={ingredient.scalable}
                onChange={(checked) => onPatch({ scalable: checked })}
              />
              <Toggle
                label="Optional"
                checked={ingredient.optional}
                onChange={(checked) => onPatch({ optional: checked })}
              />
              <RowActions label="ingredient" onInsert={onInsert} onRemove={onRemove} />
            </div>
          </div>
        </div>
      )}
    </SortableRow>
  );
}
