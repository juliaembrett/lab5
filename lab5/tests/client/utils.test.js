import { describe, expect, test } from 'vitest';
import { buildRecipeTags, mergeIngredientValue, stripHtml } from '../../public/utils.js';

describe('client utility functions', () => {
  test('stripHtml removes simple HTML tags', () => {
    expect(stripHtml('<b>Bold</b> text')).toBe('Bold text');
  });

  test('buildRecipeTags returns readable labels', () => {
    expect(buildRecipeTags({ vegetarian: true, dairyFree: true })).toEqual(['Vegetarian', 'Dairy free']);
  });

  test('mergeIngredientValue prevents duplicate ingredients', () => {
    expect(mergeIngredientValue('tomato, basil', 'Tomato')).toBe('tomato, basil');
    expect(mergeIngredientValue('tomato', 'garlic')).toBe('tomato, garlic');
  });
});
