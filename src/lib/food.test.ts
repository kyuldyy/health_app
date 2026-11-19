import { describe, expect, it } from 'vitest';
import { macrosFor, sumLog, todayStr } from './macros';
import { parseOffProduct, parseUsdaFood } from './foodApi';
import { buildPrompt, parseIdeas, recipesFromPantry } from './mealIdeas';

describe('macros', () => {
  it('scales per-100g values', () => {
    expect(macrosFor({ kcal: 200, protein: 10, carbs: 20, fat: 5 }, 150)).toEqual({ kcal: 300, protein: 15, carbs: 30, fat: 7.5 });
  });
  it('sums entries', () => { expect(sumLog([{ kcal: 1, protein: 2, carbs: 3, fat: 4 }, { kcal: 1, protein: 2, carbs: 3, fat: 4 }] as any).kcal).toBe(2); });
  it('formats dates', () => { expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05'); });
});
describe('food api parsing', () => {
  it('parses Open Food Facts', () => {
    const f = parseOffProduct({ code: '123', product_name: 'Oats', brands: 'Acme, Co', serving_quantity: '40', nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13, carbohydrates_100g: 60, fat_100g: 7 } });
    expect(f).toMatchObject({ name: 'Oats', brand: 'Acme', barcode: '123', kcal: 370, servingG: 40, source: 'off' });
    expect(parseOffProduct({ product_name: 'x', nutriments: {} })).toBeNull();
  });
  it('parses USDA', () => {
    const f = parseUsdaFood({ description: 'CHICKEN BREAST', foodNutrients: [{ nutrientId: 1008, value: 120 }, { nutrientId: 1003, value: 22 }, { nutrientId: 1005, value: 0 }, { nutrientId: 1004, value: 2.6 }] });
    expect(f).toMatchObject({ name: 'Chicken breast', kcal: 120, protein: 22, fat: 2.6, source: 'usda' });
  });
});
describe('meal ideas', () => {
  it('parses a JSON reply even with surrounding text', () => {
    const r = parseIdeas('Sure!\n[{"name":"Bowl","description":"d","ingredients":[{"name":"rice","grams":100}],"kcal":500,"protein":30,"carbs":60,"fat":10}]');
    expect(r[0].name).toBe('Bowl');
    expect(() => parseIdeas('nothing')).toThrow();
  });
  it('builds a prompt with pantry and macros', () => { expect(buildPrompt([{ name: 'Rice', grams: 500 }], { kcal: 800, protein: 50, carbs: 90, fat: 20 }, 'Dinner')).toContain('Rice: 500 g'); });
  it('only suggests saved recipes the pantry can cover', () => {
    const foods = new Map([[1, { id: 1, name: 'Rice', kcal: 130, protein: 3, carbs: 28, fat: 0, source: 'custom' as const }]]);
    const rec = [{ id: 1, name: 'R', ingredients: [{ foodId: 1, name: 'Rice', grams: 200 }] }];
    expect(recipesFromPantry(rec, [{ foodId: 1, grams: 300 }], foods)).toHaveLength(1);
    expect(recipesFromPantry(rec, [{ foodId: 1, grams: 100 }], foods)).toHaveLength(0);
  });
});
