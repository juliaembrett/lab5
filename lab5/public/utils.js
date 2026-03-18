// Converts form data into a plain object that is easier to test and inspect.
 
export function formDataToObject(formData) {
  return Object.fromEntries(formData.entries());
}

/* Converts a recipe summary from Spoonacular into plain text.
   Spoonacular often returns short HTML snippets, so this sanitizes them for display. */
export function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Safely joins boolean recipe attributes into visible tags.
export function buildRecipeTags(recipe = {}) {
  const tags = [];

  if (recipe.vegetarian) tags.push('Vegetarian');
  if (recipe.vegan) tags.push('Vegan');
  if (recipe.glutenFree) tags.push('Gluten free');
  if (recipe.dairyFree) tags.push('Dairy free');
  if (recipe.veryHealthy) tags.push('Healthy');

  return tags;
}

// Replace the current ingredient text box value with a de-duplicated list.
export function mergeIngredientValue(currentValue, nextIngredient) {
  const values = currentValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.some((item) => item.toLowerCase() === nextIngredient.toLowerCase())) {
    values.push(nextIngredient);
  }

  return values.join(', ');
}
