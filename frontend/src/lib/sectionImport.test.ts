import { describe, expect, it } from 'vitest';
import { parseBasics, parseIngredients, parseSteps } from './sectionImport';

describe('parseBasics', () => {
  it('keeps only the keys present so Import can merge', () => {
    const value = parseBasics({ title: ' Shoyu Chicken ', difficulty: 'EASY' });
    expect(value).toEqual({ title: 'Shoyu Chicken', difficulty: 'EASY' });
  });

  it('normalises nested source, servings, times and tags', () => {
    const value = parseBasics({
      source: { name: 'Kenji', url: 'https://x', type: 'WEB' },
      servings: { amount: '2', unit: 'servings' },
      times: { prepMinutes: 10 },
      tags: [' fried ', '', 'fish'],
    });
    expect(value.source).toEqual({ name: 'Kenji', url: 'https://x', type: 'WEB' });
    expect(value.servings).toEqual({ amount: 2, unit: 'servings' });
    expect(value.times).toEqual({ prepMinutes: 10, cookMinutes: null, totalMinutes: null });
    expect(value.tags).toEqual(['fried', 'fish']);
  });

  it('rejects an unknown difficulty', () => {
    expect(() => parseBasics({ difficulty: 'IMPOSSIBLE' })).toThrow(/difficulty/);
  });

  it('rejects a non-object payload', () => {
    expect(() => parseBasics([1, 2])).toThrow(/object/);
  });
});

describe('parseIngredients', () => {
  it('accepts a bare array', () => {
    const rows = parseIngredients([{ ref: 'flour', name: 'flour', quantity: 0.5, unit: 'cup' }]);
    expect(rows[0]).toMatchObject({ ref: 'flour', name: 'flour', quantity: 0.5, unit: 'cup', optional: false });
  });

  it('accepts an { ingredients } envelope', () => {
    const rows = parseIngredients({ ingredients: [{ name: 'salt', note: 'to taste' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'salt', note: 'to taste' });
  });

  it('requires a name', () => {
    expect(() => parseIngredients([{ quantity: 1 }])).toThrow(/name/);
  });
});

describe('parseSteps', () => {
  it('maps instruction, timing and uses', () => {
    const rows = parseSteps([
      { title: 'Fry', instruction: 'Fry until golden.', durationSeconds: 120, temperatureC: 180, uses: ['flour'] },
    ]);
    expect(rows[0]).toMatchObject({
      title: 'Fry',
      instruction: 'Fry until golden.',
      durationSeconds: 120,
      temperatureC: 180,
      uses: ['flour'],
    });
  });

  it('accepts a { steps } envelope and requires an instruction', () => {
    expect(parseSteps({ steps: [{ instruction: 'Mix.' }] })).toHaveLength(1);
    expect(() => parseSteps([{ title: 'x' }])).toThrow(/instruction/);
  });
});
