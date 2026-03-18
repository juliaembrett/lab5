import { describe, expect, test } from 'vitest';
import { buildRecipeSearchParams, normalizeIngredients, validateRecipeQuery } from '../../app.js';

describe('server helper functions', () => {
  test('normalizeIngredients trims values, lowers case, and removes duplicates', () => {
    expect(normalizeIngredients(' Tomato, basil, tomato,  Garlic ')).toEqual(['tomato', 'basil', 'garlic']);
  });

  test('validateRecipeQuery rejects an empty search', () => {
    expect(validateRecipeQuery({ ingredients: '', query: '' })).toEqual({
      isValid: false,
      message: 'Enter at least one ingredient or a recipe keyword.'
    });
  });

  test('buildRecipeSearchParams includes supplied filters and defaults', () => {
    const params = buildRecipeSearchParams({
      ingredients: 'rice, beans',
      diet: 'vegetarian',
      query: 'bowl',
      number: 5
    });

    expect(params.get('includeIngredients')).toBe('rice,beans');
    expect(params.get('diet')).toBe('vegetarian');
    expect(params.get('query')).toBe('bowl');
    expect(params.get('number')).toBe('5');
    expect(params.get('fillIngredients')).toBe('true');
  });
});
