import type { Food } from '../types';

const num = (v: unknown) => { const n = typeof v === 'string' ? parseFloat(v) : (v as number); return Number.isFinite(n) ? n : 0; };

/** Parse an Open Food Facts product into a Food (per 100 g). Returns null when it has no nutrition data. */
export function parseOffProduct(p: any): Food | null {
  const n = p?.nutriments;
  if (!p || !n) return null;
  const kcal = num(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0));
  const protein = num(n['proteins_100g']), carbs = num(n['carbohydrates_100g']), fat = num(n['fat_100g']);
  const name = p.product_name || p.generic_name;
  if (!name || (!kcal && !protein && !carbs && !fat)) return null;
  const serving = num(p.serving_quantity);
  return { name, brand: p.brands?.split(',')[0]?.trim() || undefined, barcode: p.code ? String(p.code) : undefined, kcal, protein, carbs, fat, servingG: serving || undefined, source: 'off' };
}

/** Parse a USDA FoodData Central search hit (nutrients are per 100 g for Foundation/SR/Branded). */
export function parseUsdaFood(f: any): Food | null {
  const get = (id: number, name?: string) => num((f.foodNutrients ?? []).find((x: any) => x.nutrientId === id || x.nutrientNumber === String(id) || (name && x.nutrientName === name))?.value);
  const kcal = get(1008, 'Energy'), protein = get(1003), carbs = get(1005), fat = get(1004);
  if (!f.description || (!kcal && !protein && !carbs && !fat)) return null;
  const name = f.description.toLowerCase().replace(/^./, (c: string) => c.toUpperCase());
  return { name, brand: f.brandName || f.brandOwner || undefined, barcode: f.gtinUpc || undefined, kcal, protein, carbs, fat, servingG: f.servingSizeUnit?.toLowerCase() === 'g' ? num(f.servingSize) || undefined : undefined, source: 'usda' };
}

async function getJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Lookup failed (${r.status})`);
  return r.json();
}

export async function lookupBarcode(code: string): Promise<Food | null> {
  const clean = code.replace(/\D/g, '');
  if (!clean) return null;
  const j = await getJson(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=code,product_name,generic_name,brands,nutriments,serving_quantity`);
  return j.status === 1 ? parseOffProduct(j.product) : null;
}

export async function searchOnline(q: string): Promise<Food[]> {
  const enc = encodeURIComponent(q);
  const [off, usda] = await Promise.allSettled([
    getJson(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,generic_name,brands,nutriments,serving_quantity`),
    getJson(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${enc}&pageSize=15&dataType=Foundation,SR%20Legacy`),
  ]);
  const out: Food[] = [];
  if (usda.status === 'fulfilled') for (const f of usda.value.foods ?? []) { const p = parseUsdaFood(f); if (p) out.push(p); }
  if (off.status === 'fulfilled') for (const f of off.value.products ?? []) { const p = parseOffProduct(f); if (p) out.push(p); }
  if (!out.length && off.status === 'rejected' && usda.status === 'rejected') throw new Error('Could not reach the food databases. Check your connection.');
  return out;
}
