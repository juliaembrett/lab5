import { beforeEach, describe, expect, test, vi } from 'vitest';

const html = `
  <form id="recipe-form"></form>
  <input id="ingredients" />
  <ul id="ingredient-suggestions"></ul>
  <div id="results"></div>
  <div id="status-message"></div>
  <p id="result-count"></p>
  <button id="random-btn"></button>
  <dialog id="recipe-modal"></dialog>
  <div id="modal-content"></div>
  <h2 id="modal-title"></h2>
  <button id="close-modal"></button>
`;

describe('client DOM rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = html;

    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  test('renderRecipes outputs recipe titles into the results container', async () => {
    const module = await import('../../public/app.js');

    module.renderRecipes([
      {
        id: 7,
        title: 'Lentil Curry',
        image: 'test.jpg',
        readyInMinutes: 30,
        servings: 4,
        summary: '<p>Comforting and easy.</p>',
        vegetarian: true,
        sourceUrl: 'https://example.com'
      }
    ]);

    expect(document.querySelector('#results').textContent).toContain('Lentil Curry');
    expect(document.querySelector('#results').textContent).toContain('Comforting and easy.');
  });

  test('renderRecipeModal fills the dialog with ingredients and steps', async () => {
    const module = await import('../../public/app.js');

    module.renderRecipeModal({
      title: 'Veggie Pasta',
      image: 'pasta.jpg',
      readyInMinutes: 20,
      servings: 2,
      summary: '<p>Quick dinner.</p>',
      extendedIngredients: [{ original: '200 g pasta' }],
      analyzedInstructions: [{ steps: [{ step: 'Boil pasta.' }] }]
    });

    expect(document.querySelector('#modal-title').textContent).toBe('Veggie Pasta');
    expect(document.querySelector('#modal-content').textContent).toContain('200 g pasta');
    expect(document.querySelector('#modal-content').textContent).toContain('Boil pasta.');
  });
});
