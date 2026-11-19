import type { Food, PantryItem, Recipe } from '../types';
import { macrosFor, type Macros } from './macros';

export interface MealIdea { name: string; description: string; ingredients: { name: string; grams: number }[]; kcal: number; protein: number; carbs: number; fat: number }

export function buildPrompt(pantry: { name: string; grams: number }[], remaining: Macros, slot: string) {
  const items = pantry.map((p) => `- ${p.name}: ${Math.round(p.grams)} g available`).join('\n');
  return `Suggest 3 ${slot.toLowerCase()} ideas using mainly the pantry items below. Stay within the grams available. Remaining macros for today: ${Math.round(remaining.kcal)} kcal, ${Math.round(remaining.protein)} g protein, ${Math.round(remaining.carbs)} g carbs, ${Math.round(remaining.fat)} g fat. Aim to fit them (one meal should use roughly a third or less of the remaining kcal unless it's the last meal of the day). Basic staples (salt, oil, spices, water) may be assumed.

Pantry:
${items}

Reply with ONLY a JSON array, no prose. Each element: {"name": string, "description": string (one sentence), "ingredients": [{"name": string, "grams": number}], "kcal": number, "protein": number, "carbs": number, "fat": number}. Macros are for the whole meal.`;
}

export function parseIdeas(text: string): MealIdea[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('No ideas in response');
  const arr = JSON.parse(m[0]);
  if (!Array.isArray(arr)) throw new Error('Unexpected response');
  return arr.filter((x) => x && typeof x.name === 'string' && Array.isArray(x.ingredients)).map((x) => ({
    name: x.name, description: String(x.description ?? ''), ingredients: x.ingredients.map((i: any) => ({ name: String(i.name), grams: Number(i.grams) || 0 })),
    kcal: Number(x.kcal) || 0, protein: Number(x.protein) || 0, carbs: Number(x.carbs) || 0, fat: Number(x.fat) || 0,
  }));
}

/** Calls Claude directly from the browser using the user's own API key (stored on this device only). */
export async function askClaude(key: string, prompt: string): Promise<MealIdea[]> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(r.status === 401 ? 'Invalid API key' : `Claude request failed (${r.status})`);
  const j = await r.json();
  return parseIdeas(j.content?.map((c: any) => c.text ?? '').join('') ?? '');
}

/** Offline fallback: saved recipes whose ingredients are all in the pantry in sufficient amount. */
export function recipesFromPantry(recipes: Recipe[], pantry: PantryItem[], foods: Map<number, Food>): (Recipe & Macros)[] {
  const have = new Map(pantry.map((p) => [p.foodId, p.grams]));
  return recipes.filter((r) => r.ingredients.every((i) => (have.get(i.foodId) ?? 0) >= i.grams)).map((r) => {
    const t = r.ingredients.reduce((a, i) => { const f = foods.get(i.foodId); if (!f) return a; const m = macrosFor(f, i.grams); return { kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return { ...r, ...t };
  });
}
