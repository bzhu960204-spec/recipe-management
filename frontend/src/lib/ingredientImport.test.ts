import { describe, expect, it } from 'vitest';
import { parseIngredientImport } from './ingredientImport';

describe('parseIngredientImport', () => {
  it('parses the user amount-first list', () => {
    const rows = parseIngredientImport(
      ['1/2杯 小麦淀粉', '1/2杯 玉米淀粉', '1小勺 泡打粉', '1/4小勺 苏打粉'].join('\n'),
    );
    expect(rows).toEqual([
      { section: '', quantity: '0.5', quantityMax: '', unit: '杯', name: '小麦淀粉', note: '', optional: false },
      { section: '', quantity: '0.5', quantityMax: '', unit: '杯', name: '玉米淀粉', note: '', optional: false },
      { section: '', quantity: '1', quantityMax: '', unit: '小勺', name: '泡打粉', note: '', optional: false },
      { section: '', quantity: '0.25', quantityMax: '', unit: '小勺', name: '苏打粉', note: '', optional: false },
    ]);
  });

  it('parses the same list written name-first', () => {
    const rows = parseIngredientImport(['小麦淀粉 1/2杯', '泡打粉 1小勺'].join('\n'));
    expect(rows[0]).toMatchObject({ quantity: '0.5', unit: '杯', name: '小麦淀粉' });
    expect(rows[1]).toMatchObject({ quantity: '1', unit: '小勺', name: '泡打粉' });
  });

  it('applies section headers to the lines beneath them', () => {
    const rows = parseIngredientImport(['# 鱼柳', '500g 冷冻鱼柳', '盐', '# 裹粉', '1/2 cup flour'].join('\n'));
    expect(rows.map((row) => row.section)).toEqual(['鱼柳', '鱼柳', '裹粉']);
    expect(rows[0]).toMatchObject({ quantity: '500', unit: 'g', name: '冷冻鱼柳' });
  });

  it('leaves the amount empty for a to-taste ingredient', () => {
    expect(parseIngredientImport('salt')[0]).toMatchObject({ quantity: '', unit: '', name: 'salt' });
    expect(parseIngredientImport('盐')[0]).toMatchObject({ quantity: '', unit: '', name: '盐' });
  });

  it('reads a note from parentheses and a trailing ? as optional', () => {
    const [row] = parseIngredientImport('500g 冷冻鱼柳 (袋装，解冻后斜刀切条) ?');
    expect(row).toMatchObject({
      quantity: '500',
      unit: 'g',
      name: '冷冻鱼柳',
      note: '袋装，解冻后斜刀切条',
      optional: true,
    });
  });

  it('parses ranges with a hyphen or tilde', () => {
    expect(parseIngredientImport('1-2小勺 辣椒粉')[0]).toMatchObject({ quantity: '1', quantityMax: '2', unit: '小勺' });
    expect(parseIngredientImport('1~2 tsp chili')[0]).toMatchObject({ quantity: '1', quantityMax: '2', unit: 'tsp' });
  });

  it('understands fractions, glyphs and mixed numbers', () => {
    expect(parseIngredientImport('½ cup sugar')[0]).toMatchObject({ quantity: '0.5', unit: 'cup', name: 'sugar' });
    expect(parseIngredientImport('1 1/2 cups milk')[0]).toMatchObject({ quantity: '1.5', unit: 'cups', name: 'milk' });
    expect(parseIngredientImport('1½ cup rice')[0]).toMatchObject({ quantity: '1.5', unit: 'cup', name: 'rice' });
  });

  it('keeps an amount with no known unit as a plain name', () => {
    expect(parseIngredientImport('2 eggs')[0]).toMatchObject({ quantity: '2', unit: '', name: 'eggs' });
  });

  it('ignores blank lines', () => {
    expect(parseIngredientImport('\n\n1 tsp salt\n\n')).toHaveLength(1);
  });
});
