/**
 * Open Food Facts istemcisi (ücretsiz, anahtar gerektirmez).
 * Dokümantasyon: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Her istekte: zaman aşımı, yeniden deneme, anlamlı hata mesajı ve
 * (zorunlu) özel User-Agent kullanılır.
 */
import { normalizeBarcode } from './ean';

const HOSTS = ['https://world.openfoodfacts.org', 'https://world.openfoodfacts.net'];
const UA = 'NutriLens/1.0 (https://github.com/furkankisi/nutrilens)';

const FIELDS = [
  'code',
  'product_name',
  'product_name_tr',
  'generic_name',
  'brands',
  'quantity',
  'categories',
  'image_front_url',
  'image_front_small_url',
  'ingredients_text',
  'ingredients_text_tr',
  'ingredients_analysis_tags',
  'allergens_tags',
  'traces_tags',
  'labels_tags',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'nutriments',
].join(',');

export type Product = {
  code: string;
  name: string;
  brand?: string;
  quantity?: string;
  category?: string;
  image?: string;
  thumb?: string;
  ingredientsText: string;
  analysisTags: string[];
  allergens: string[];
  traces: string[];
  labels: string[];
  nutriscore?: 'a' | 'b' | 'c' | 'd' | 'e';
  nova?: number;
  nutrients: {
    energyKcal?: number;
    fat?: number;
    saturatedFat?: number;
    carbs?: number;
    sugars?: number;
    fiber?: number;
    protein?: number;
    salt?: number;
  };
};

export class ApiError extends Error {
  kind: 'network' | 'timeout' | 'server' | 'notfound';
  constructor(kind: ApiError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

async function fetchJson(path: string, timeoutMs = 12000): Promise<any> {
  let lastErr: ApiError | null = null;
  for (const host of HOSTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 404) return null;
      if (!res.ok) {
        lastErr = new ApiError('server', `Sunucu hatası (${res.status})`);
        continue;
      }
      return await res.json();
    } catch (e: any) {
      clearTimeout(timer);
      lastErr =
        e?.name === 'AbortError'
          ? new ApiError('timeout', 'Sunucu yanıt vermedi. Bağlantını kontrol et.')
          : new ApiError('network', 'İnternet bağlantısı kurulamadı.');
    }
  }
  throw lastErr ?? new ApiError('network', 'Bağlantı hatası.');
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

function mapProduct(p: any): Product | null {
  if (!p) return null;
  const n = p.nutriments ?? {};
  const grade = typeof p.nutriscore_grade === 'string' ? p.nutriscore_grade.toLowerCase() : undefined;
  const name = (p.product_name_tr || p.product_name || p.generic_name || '').toString().trim();
  if (!name && !p.code) return null;
  return {
    code: String(p.code ?? ''),
    name: name || 'İsimsiz ürün',
    brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
    quantity: p.quantity || undefined,
    category: p.categories ? String(p.categories).split(',').pop()?.trim() : undefined,
    image: p.image_front_url || p.image_front_small_url || undefined,
    thumb: p.image_front_small_url || p.image_front_url || undefined,
    ingredientsText: (p.ingredients_text_tr || p.ingredients_text || '').toString().trim(),
    analysisTags: p.ingredients_analysis_tags ?? [],
    allergens: p.allergens_tags ?? [],
    traces: p.traces_tags ?? [],
    labels: p.labels_tags ?? [],
    nutriscore: grade && 'abcde'.includes(grade) && grade.length === 1 ? (grade as Product['nutriscore']) : undefined,
    nova: num(p.nova_group),
    nutrients: {
      energyKcal: num(n['energy-kcal_100g']),
      fat: num(n.fat_100g),
      saturatedFat: num(n['saturated-fat_100g']),
      carbs: num(n.carbohydrates_100g),
      sugars: num(n.sugars_100g),
      fiber: num(n.fiber_100g),
      protein: num(n.proteins_100g),
      salt: num(n.salt_100g),
    },
  };
}

/** Barkoddan ürün getirir. Bulunamazsa null döner. */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const code = normalizeBarcode(barcode);
  const json = await fetchJson(`/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (!json || json.status === 0 || !json.product) return null;
  return mapProduct({ ...json.product, code: json.product.code ?? code });
}

export type SearchResult = { products: Product[]; total: number };

/** Metin araması. */
export async function searchProducts(query: string, page = 1, pageSize = 24): Promise<SearchResult> {
  const q = encodeURIComponent(query.trim());
  const json = await fetchJson(
    `/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page=${page}&page_size=${pageSize}&sort_by=unique_scans_n&fields=${FIELDS}`,
    15000,
  );
  const products = ((json?.products ?? []) as any[]).map(mapProduct).filter((p): p is Product => !!p && !!p.code);
  return { products, total: Number(json?.count ?? products.length) };
}

export type Category = { id: string; label: string; icon: string; tag: string };

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'Popüler', icon: 'flame', tag: '' },
  { id: 'snacks', label: 'Atıştırmalık', icon: 'fast-food', tag: 'snacks' },
  { id: 'beverages', label: 'İçecek', icon: 'water', tag: 'beverages' },
  { id: 'dairy', label: 'Süt Ürünleri', icon: 'cafe', tag: 'dairies' },
  { id: 'breakfast', label: 'Kahvaltılık', icon: 'sunny', tag: 'breakfasts' },
  { id: 'biscuits', label: 'Bisküvi', icon: 'ellipse', tag: 'biscuits-and-cakes' },
  { id: 'chocolate', label: 'Çikolata', icon: 'heart', tag: 'chocolates' },
  { id: 'pasta', label: 'Makarna', icon: 'restaurant', tag: 'pasta' },
  { id: 'plant', label: 'Bitkisel', icon: 'leaf', tag: 'plant-based-foods' },
];

/** Kategoriye göre (varsayılan: Türkiye'de en çok taranan) ürünleri listeler. */
export async function browseCategory(tag: string, page = 1, pageSize = 24): Promise<SearchResult> {
  const params = [
    'countries_tags_en=turkey',
    tag ? `categories_tags_en=${encodeURIComponent(tag)}` : '',
    'sort_by=unique_scans_n',
    `page=${page}`,
    `page_size=${pageSize}`,
    `fields=${FIELDS}`,
  ]
    .filter(Boolean)
    .join('&');
  const json = await fetchJson(`/api/v2/search?${params}`, 15000);
  const products = ((json?.products ?? []) as any[])
    .map(mapProduct)
    .filter((p): p is Product => !!p && !!p.code && !!p.image);
  return { products, total: Number(json?.count ?? products.length) };
}
