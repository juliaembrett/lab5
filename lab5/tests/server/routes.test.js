import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../../app.js';

describe('recipe routes', () => {
  beforeEach(() => {
    process.env.SPOONACULAR_API_KEY = 'test-key';
  });

  test('GET /api/health returns ok', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('GET /api/recipes returns 400 if the user provides no search criteria', async () => {
    const app = createApp();
    const response = await request(app).get('/api/recipes');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Enter at least one ingredient/i);
  });

  test('GET /api/recipes returns recipe results from the mocked API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalResults: 1,
        results: [{ id: 1, title: 'Tomato Soup' }]
      })
    });

    const app = createApp(mockFetch);
    const response = await request(app).get('/api/recipes?ingredients=tomato');

    expect(response.status).toBe(200);
    expect(response.body.results[0].title).toBe('Tomato Soup');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('GET /api/recipes/:id rejects invalid ids', async () => {
    const app = createApp();
    const response = await request(app).get('/api/recipes/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/positive number/i);
  });
});
