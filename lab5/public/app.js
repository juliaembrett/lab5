import { buildRecipeTags, formDataToObject, mergeIngredientValue, stripHtml } from './utils.js';

const form = document.querySelector('#recipe-form');
const ingredientsInput = document.querySelector('#ingredients');
const suggestionsList = document.querySelector('#ingredient-suggestions');
const resultsContainer = document.querySelector('#results');
const statusMessage = document.querySelector('#status-message');
const resultCount = document.querySelector('#result-count');
const randomButton = document.querySelector('#random-btn');
const modal = document.querySelector('#recipe-modal');
const modalContent = document.querySelector('#modal-content');
const modalTitle = document.querySelector('#modal-title');
const closeModalButton = document.querySelector('#close-modal');

// Updates the main status box so the user always knows what is happening.
function setStatus(message, variant = 'default') {
  statusMessage.textContent = message;
  statusMessage.dataset.variant = variant;
}

// Small wrapper around fetch that produces consistent client-side errors.
async function requestJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

// Creates accessible recipe cards.
export function renderRecipes(recipes = []) {
  if (!recipes.length) {
    resultsContainer.innerHTML = '<p class="empty-state">No recipes matched your search. Try changing the ingredients or filters.</p>';
    return;
  }

  resultsContainer.innerHTML = recipes
    .map((recipe) => {
      const tags = buildRecipeTags(recipe)
        .map((tag) => `<li class="tag">${tag}</li>`)
        .join('');

      return `
        <article class="recipe-card">
          <img src="${recipe.image}" alt="Photo of ${recipe.title}" />
          <div class="recipe-card__body">
            <h3>${recipe.title}</h3>
            <p class="recipe-meta">Ready in ${recipe.readyInMinutes || 'N/A'} minutes • Serves ${recipe.servings || 'N/A'}</p>
            <p class="recipe-summary">${stripHtml(recipe.summary || 'Recipe summary unavailable.')}</p>
            <ul class="tag-list">${tags}</ul>
            <div class="recipe-card__actions">
              <button class="button button--primary" data-recipe-id="${recipe.id}">View details</button>
              ${recipe.sourceUrl ? `<a class="recipe-card__link" href="${recipe.sourceUrl}" target="_blank" rel="noreferrer">Original recipe</a>` : ''}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// Renders the recipe detail dialog.
export function renderRecipeModal(recipe) {
  const modal = document.querySelector('#recipe-modal');
  const modalTitle = document.querySelector('#modal-title');
  const modalContent = document.querySelector('#modal-content');

  // Guard clause in case required DOM elements are missing
  if (!modal || !modalTitle || !modalContent) {
    return;
  }

  // Put the recipe title into the modal heading
  modalTitle.textContent = recipe.title || 'Recipe details';

  // Build ingredients list safely
  const ingredients = (recipe.extendedIngredients || [])
    .map((ingredient) => `<li>${ingredient.original}</li>`)
    .join('');

  // Build instructions safely
  const steps =
    recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0
      ? recipe.analyzedInstructions[0].steps
          .map((step) => `<li>${step.step}</li>`)
          .join('')
      : '<li>No instructions available.</li>';

  // Fill the modal body
  modalContent.innerHTML = `
    ${
      recipe.image
        ? `<img src="${recipe.image}" alt="${recipe.title}" class="modal__image" />`
        : ''
    }
    <h3>Ingredients</h3>
    <ul>${ingredients || '<li>No ingredients available.</li>'}</ul>
    <h3>Instructions</h3>
    <ol>${steps}</ol>
  `;

  // Open the dialog
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

// Performs the recipe search using form values.
async function handleSearch(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const values = formDataToObject(formData);
  const params = new URLSearchParams(values);

  try {
    setStatus('Searching for recipes...');
    resultsContainer.innerHTML = '';
    form.classList.add('loading');

    const data = await requestJson(`/api/recipes?${params.toString()}`);
    renderRecipes(data.results);

    resultCount.textContent = `${data.results.length} recipe${data.results.length === 1 ? '' : 's'} shown`;
    setStatus(data.results.length ? 'Search complete.' : 'No matching recipes were found.');
  } catch (error) {
    resultCount.textContent = '0 recipes shown';
    resultsContainer.innerHTML = '';
    setStatus(error.message, 'error');
  } finally {
    form.classList.remove('loading');
  }
}

// Fetch one random recipe 
async function handleRandomRecipe() {
  try {
    setStatus('Finding a random recipe...');
    resultsContainer.innerHTML = '';
    const data = await requestJson('/api/recipes/random');

    if (!data.recipe) {
      throw new Error('Random recipe could not be loaded.');
    }

    renderRecipes([data.recipe]);
    resultCount.textContent = '1 surprise recipe shown';
    setStatus('Random recipe loaded.');
  } catch (error) {
    resultCount.textContent = '0 recipes shown';
    setStatus(error.message, 'error');
  }
}

// Fetches full recipe details when a card button is clicked.
async function handleResultClick(event) {
  const button = event.target.closest('[data-recipe-id]');
  if (!button) return;

  try {
    const recipeId = button.dataset.recipeId;
    const recipe = await requestJson(`/api/recipes/${recipeId}`);
    renderRecipeModal(recipe);
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

let suggestionTimer;

/* Auto-complete helps the user discover valid ingredient names.
   A short debounce reduces unnecessary requests while typing. */
function handleIngredientInput() {
  clearTimeout(suggestionTimer);

  const currentTerm = ingredientsInput.value.split(',').pop().trim();

  if (currentTerm.length < 2) {
    suggestionsList.innerHTML = '';
    return;
  }

  suggestionTimer = setTimeout(async () => {
    try {
      const data = await requestJson(`/api/ingredients/autocomplete?q=${encodeURIComponent(currentTerm)}`);
      suggestionsList.innerHTML = data.suggestions
        .map(
          (item) => `
            <li>
              <button class="suggestion-btn" type="button" data-suggestion="${item.name}">${item.name}</button>
            </li>
          `
        )
        .join('');
    } catch {
      // Suggestion failure should not block the rest of the app.
      suggestionsList.innerHTML = '';
    }
  }, 250);
}

// Clicking a suggestion merges it into the text box without duplicates.
function handleSuggestionClick(event) {
  const button = event.target.closest('[data-suggestion]');
  if (!button) return;

  ingredientsInput.value = mergeIngredientValue(ingredientsInput.value, button.dataset.suggestion);
  suggestionsList.innerHTML = '';
  ingredientsInput.focus();
}

function handleReset() {
  resultsContainer.innerHTML = '';
  resultCount.textContent = 'No search yet.';
  setStatus('Form cleared. Enter ingredients or a recipe keyword to search again.');
  suggestionsList.innerHTML = '';
}

function closeModal() {
  modal.close();
}

form.addEventListener('submit', handleSearch);
form.addEventListener('reset', handleReset);
randomButton.addEventListener('click', handleRandomRecipe);
resultsContainer.addEventListener('click', handleResultClick);
ingredientsInput.addEventListener('input', handleIngredientInput);
suggestionsList.addEventListener('click', handleSuggestionClick);
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  const dialogDimensions = modal.getBoundingClientRect();
  const clickedOutside =
    event.clientX < dialogDimensions.left ||
    event.clientX > dialogDimensions.right ||
    event.clientY < dialogDimensions.top ||
    event.clientY > dialogDimensions.bottom;

  if (clickedOutside) closeModal();
});
