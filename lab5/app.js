import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

/* Converts a comma-separated ingredient string into a clean list.
   This is kept as a small pure function so it can be unit tested easily. */
export function normalizeIngredients(rawIngredients = '') {
  return rawIngredients
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

/* Makes sure the user has provided at least one useful search input so the
   API is not called on an empty form. */
export function validateRecipeQuery({ ingredients, query }) {
  const cleanedIngredients = normalizeIngredients(ingredients);
  const cleanedQuery = String(query || '').trim();

  if (!cleanedIngredients.length && !cleanedQuery) {
    return {
      isValid: false,
      message: 'Enter at least one ingredient or a recipe keyword.'
    };
  }

  return {
    isValid: true,
    cleanedIngredients,
    cleanedQuery
  };
}

/* Builds URLSearchParams for Spoonacular's complexSearch endpoint.
   Having this logic extracted keeps route handlers shorter and easier to read. */
export function buildRecipeSearchParams(query = {}) {
  const params = new URLSearchParams();
  const cleanedIngredients = normalizeIngredients(query.ingredients || '');

  if (cleanedIngredients.length) {
    params.set('includeIngredients', cleanedIngredients.join(','));
  }

  if (query.query?.trim()) {
    params.set('query', query.query.trim());
  }

  if (query.diet?.trim()) {
    params.set('diet', query.diet.trim());
  }

  if (query.intolerances?.trim()) {
    params.set('intolerances', query.intolerances.trim());
  }

  if (query.type?.trim()) {
    params.set('type', query.type.trim());
  }

  // Request extra recipe details in one round trip to reduce UI latency.
  params.set('instructionsRequired', 'true');
  params.set('addRecipeInformation', 'true');
  params.set('fillIngredients', 'true');
  params.set('number', String(query.number || 8));
  params.set('sort', query.sort || 'max-used-ingredients');
  params.set('sortDirection', 'desc');

  return params;
}

// Small helper for all Spoonacular requests.
export async function spoonacularFetch(endpoint, fetchImpl = fetch) {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (!apiKey) {
    const error = new Error('Missing Spoonacular API key. Add SPOONACULAR_API_KEY to your .env file.');
    error.status = 500;
    throw error;
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${SPOONACULAR_BASE_URL}${endpoint}${separator}apiKey=${apiKey}`;
  const response = await fetchImpl(url);

  if (!response.ok) {
    let details = 'Unable to reach the recipe service.';

    try {
      const errorPayload = await response.json();
      details = errorPayload.message || details;
    } catch {
      // If the payload cannot be parsed, keep default message.
    }

    const error = new Error(details);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function createApp(fetchImpl = fetch) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/recipes', async (req, res, next) => {
    try {
      const validation = validateRecipeQuery(req.query);

      if (!validation.isValid) {
        return res.status(400).json({ message: validation.message });
      }

      const params = buildRecipeSearchParams(req.query);
      const data = await spoonacularFetch(`/recipes/complexSearch?${params.toString()}`, fetchImpl);

      res.json({
        totalResults: data.totalResults || 0,
        results: data.results || []
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/recipes/random', async (_req, res, next) => {
    try {
      const data = await spoonacularFetch('/recipes/random?number=1', fetchImpl);
      res.json({ recipe: data.recipes?.[0] || null });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/recipes/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Recipe id must be a positive number.' });
      }

      const data = await spoonacularFetch(`/recipes/${id}/information`, fetchImpl);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/ingredients/autocomplete', async (req, res, next) => {
    try {
      const query = String(req.query.q || '').trim();

      if (!query) {
        return res.status(400).json({ message: 'Enter at least one character for ingredient suggestions.' });
      }

      const data = await spoonacularFetch(
        `/food/ingredients/autocomplete?query=${encodeURIComponent(query)}&number=5&metaInformation=true`,
        fetchImpl
      );

      res.json({ suggestions: data || [] });
    } catch (error) {
      next(error);
    }
  });

  // Generic error handler so the UI receives predictable JSON messages.
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Something went wrong on the server.'
    });
  });

  return app;
}
