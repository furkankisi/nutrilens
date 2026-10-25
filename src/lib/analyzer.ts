/**
 * İçerik analiz motoru (Türkçe + İngilizce).
 * Girdi: içindekiler metni (OCR veya Open Food Facts) ve varsa OFF etiketleri.
 * Çıktı: her diyet için evet / hayır / belirsiz / bilinmiyor + gerekçeler.
 */

export type DietId = 'vegan' | 'vegetarian' | 'gluten' | 'dairy' | 'egg' | 'nuts' | 'soy';
export type Verdict = 'yes' | 'maybe' | 'no' | 'unknown';

export type DietMeta = { id: DietId; label: string; short: string; icon: string };

export const DIETS: DietMeta[] = [
  { id: 'vegan', label: 'Vegan', short: 'Vegan', icon: 'leaf' },
  { id: 'vegetarian', label: 'Vejetaryen', short: 'Vejetaryen', icon: 'nutrition' },
  { id: 'gluten', label: 'Glütensiz', short: 'Glütensiz', icon: 'ban' },
  { id: 'dairy', label: 'Süt ürünü içermez', short: 'Sütsüz', icon: 'water' },
  { id: 'egg', label: 'Yumurta içermez', short: 'Yumurtasız', icon: 'egg' },
  { id: 'nuts', label: 'Kuruyemiş / fıstık içermez', short: 'Kuruyemişsiz', icon: 'alert-circle' },
  { id: 'soy', label: 'Soya içermez', short: 'Soyasız', icon: 'flower' },
];

export type DietResult = {
  diet: DietMeta;
  verdict: Verdict;
  reasons: string[];
};

export type AnalysisInput = {
  ingredientsText: string;
  analysisTags?: string[];
  allergens?: string[];
  traces?: string[];
};

export type Analysis = {
  results: DietResult[];
  hasText: boolean;
  matchedIngredients: number;
};

// ---------------------------------------------------------------- yardımcılar

/** Türkçe karakterleri sadeleştirir ve küçük harfe çevirir. */
export function normalize(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** OCR çıktısındaki yaygın bozuklukları toparlar. */
export function cleanOcr(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/-\n/g, '') // satır sonu tireleme
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const TRACE_MARKERS = [
  'icerebilir',
  'eser miktarda',
  'eser miktar',
  'ile ayni tesiste',
  'ayni tesiste',
  'ayni hatta',
  'may contain',
  'traces of',
  'produced in a facility',
  'manufactured in a facility',
];

/** Metni "ana içerik" ve "iz miktarı/çapraz bulaşma" bölümlerine ayırır. */
function splitTrace(norm: string): { main: string; trace: string } {
  let idx = -1;
  for (const m of TRACE_MARKERS) {
    const i = norm.indexOf(m);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return { main: norm, trace: '' };
  // İz bölümü genelde cümle başında başlar; bir önceki ayırıcıdan itibaren al.
  const start = Math.max(norm.lastIndexOf('.', idx), norm.lastIndexOf(';', idx), norm.lastIndexOf(':', idx));
  const cut = start === -1 ? idx : start;
  return { main: norm.slice(0, cut), trace: norm.slice(cut) };
}

type Rule = { terms: string[]; label: string; exact?: boolean };

function matchRules(text: string, rules: Rule[]): string[] {
  const hits: string[] = [];
  for (const rule of rules) {
    for (const term of rule.terms) {
      const re = rule.exact
        ? new RegExp(`(^|[^a-z0-9])${term}($|[^a-z0-9])`)
        : new RegExp(`(^|[^a-z0-9])${term}`);
      if (re.test(text)) {
        hits.push(rule.label);
        break;
      }
    }
  }
  return hits;
}

/** "E471", "e 120", "E-322" gibi katkı kodlarını yakalar. */
function extractECodes(norm: string): string[] {
  const out = new Set<string>();
  const re = /(?:^|[^a-z0-9])e[\s-]?(\d{3,4})([a-i])?(?![0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) out.add(`e${m[1]}${m[2] ?? ''}`);
  return [...out];
}

// ------------------------------------------------------------------ kurallar
// Not: terimler normalize edilmiş (ASCII, küçük harf) metne karşı "kelime başı" eşleşir.

const MEAT_FISH: Rule[] = [
  { label: 'et', terms: ['et', 'etli', 'dana', 'sigir', 'kuzu', 'koyun', 'tavuk', 'pilic', 'hindi', 'ordek', 'kaz'], exact: true },
  { label: 'et / et ürünü', terms: ['dana', 'sigir', 'kuzu', 'tavuk', 'pilic', 'hindi', 'jambon', 'sucuk', 'salam', 'sosis', 'pastirma', 'bakon', 'domuz', 'kiyma', 'karkas', 'kemik', 'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'ham ', 'bacon', 'sausage', 'poultry'] },
  { label: 'balık / deniz ürünü', terms: ['balik', 'ton bal', 'somon', 'hamsi', 'uskumru', 'sardalya', 'karides', 'midye', 'kalamar', 'ahtapot', 'istakoz', 'yengec', 'fish', 'tuna', 'salmon', 'anchov', 'shrimp', 'prawn', 'crab', 'squid', 'surimi', 'fish sauce'] },
  { label: 'jelatin', terms: ['jelatin', 'gelatin', 'gelatine'] },
  { label: 'hayvansal yağ', terms: ['hayvansal yag', 'donyag', 'don yag', 'sigir yag', 'tavuk yag', 'kuyruk yag', 'lard', 'tallow', 'animal fat', 'suet'] },
  { label: 'karmin / koşineal (böcek boyası)', terms: ['karmin', 'kosinil', 'kosineal', 'carmine', 'cochineal'] },
  { label: 'kolajen', terms: ['kolajen', 'collagen'] },
  { label: 'balık zarı (isinglass)', terms: ['isinglass', 'balik tutkali'] },
];

const DAIRY: Rule[] = [
  { label: 'süt', terms: ['sut', 'milk', 'laban'] },
  { label: 'peynir', terms: ['peynir', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'lor ', 'labne', 'kasar', 'tulum'] },
  { label: 'yoğurt / ayran / kefir', terms: ['yogurt', 'yoghurt', 'ayran', 'kefir', 'buttermilk'] },
  { label: 'tereyağı / krema', terms: ['tereyag', 'butter', 'krema', 'cream', 'kaymak', 'ghee', 'margarin sut'] },
  { label: 'peynir altı suyu (whey)', terms: ['peynir alti', 'peyniralti', 'whey', 'patamaz'] },
  { label: 'kazein', terms: ['kazein', 'kazeinat', 'casein', 'caseinate'] },
  { label: 'laktoz', terms: ['laktoz', 'lactose'] },
  { label: 'süt tozu / süt proteini', terms: ['sut tozu', 'sut proteini', 'milk powder', 'milk protein', 'laktalbumin', 'laktoglobulin'] },
];

const DAIRY_MAYBE: Rule[] = [
  { label: 'aroma (kaynağı belirsiz olabilir)', terms: ['sutlu', 'creamy'] },
];

const EGG: Rule[] = [
  { label: 'yumurta', terms: ['yumurta', 'egg', 'albumin', 'albumen', 'lizozim', 'lysozyme', 'ovalbumin', 'ovomukoid'] },
];

const EGG_MAYBE: Rule[] = [{ label: 'mayonez (genelde yumurtalı)', terms: ['mayonez', 'mayonnaise'] }];

const HONEY_BEE: Rule[] = [
  { label: 'bal', terms: ['bal', 'bali', 'honey'], exact: true },
  { label: 'balmumu', terms: ['balmumu', 'beeswax'] },
  { label: 'arı sütü / propolis', terms: ['ari sutu', 'propolis', 'royal jelly'] },
  { label: 'gomalak (shellac)', terms: ['gomalak', 'shellac'] },
  { label: 'lanolin', terms: ['lanolin'] },
];

const VEGAN_MAYBE: Rule[] = [
  { label: 'lesitin (genelde soya, bazen yumurta)', terms: ['lesitin', 'lecithin'] },
  { label: 'mono ve digliseritler (kaynak belirsiz)', terms: ['mono ve digliserit', 'mono- ve digliserit', 'mono and diglycerid', 'monogliserit', 'digliserit', 'mono- and diglycerid'] },
  { label: 'doğal aroma (kaynak belirsiz)', terms: ['dogal aroma', 'natural flavo', 'aroma verici', 'aroma vericiler'] },
  { label: 'gliserin (kaynak belirsiz)', terms: ['gliserin', 'gliserol', 'glycerin', 'glycerol'] },
  { label: 'peynir mayası (hayvansal olabilir)', terms: ['peynir mayasi', 'rennet'] },
  { label: 'L-sistein', terms: ['l-sistein', 'sistein', 'cysteine'] },
];

const GLUTEN: Rule[] = [
  { label: 'buğday', terms: ['bugday', 'wheat'] },
  { label: 'arpa', terms: ['arpa', 'barley'] },
  { label: 'çavdar', terms: ['cavdar', 'rye'] },
  { label: 'glüten', terms: ['gluten'] },
  { label: 'irmik', terms: ['irmik', 'semolina'] },
  { label: 'bulgur', terms: ['bulgur'] },
  { label: 'kuskus', terms: ['kuskus', 'couscous'] },
  { label: 'makarna / şehriye', terms: ['makarna', 'sehriye', 'eriste', 'pasta'] },
  { label: 'malt', terms: ['malt', 'malti', 'maltlanmis', 'maltli'], exact: true },
  { label: 'kavuzlu buğday / tritikale', terms: ['spelt', 'kamut', 'triticale', 'tritikale', 'farro', 'einkorn', 'seitan'] },
  { label: 'un (buğday unu)', terms: ['un', 'flour'], exact: true },
  { label: 'ekmek / bisküvi / galeta', terms: ['galeta', 'ekmek', 'biskuvi', 'kraker', 'bread', 'breadcrumb', 'cracker'] },
];

const GLUTEN_MAYBE: Rule[] = [
  { label: 'yulaf (çapraz bulaşma olabilir)', terms: ['yulaf', 'oat'] },
  { label: 'nişasta (kaynak belirsiz)', terms: ['nisasta', 'starch'] },
  { label: 'soya sosu (genelde buğday içerir)', terms: ['soya sosu', 'soy sauce'] },
];

const NUTS: Rule[] = [
  { label: 'fındık', terms: ['findik', 'hazelnut', 'filbert'] },
  { label: 'yer fıstığı', terms: ['yer fistig', 'fistik ezmesi', 'peanut', 'groundnut'] },
  { label: 'fıstık', terms: ['fistik'] },
  { label: 'antep fıstığı', terms: ['antep fistig', 'pistachio', 'pistasyo'] },
  { label: 'badem', terms: ['badem', 'almond', 'marzipan', 'marsipan'] },
  { label: 'ceviz', terms: ['ceviz', 'walnut'] },
  { label: 'kaju', terms: ['kaju', 'cashew'] },
  { label: 'pekan / macadamia / brezilya cevizi', terms: ['pekan', 'pecan', 'macadamia', 'brezilya ceviz', 'brazil nut'] },
  { label: 'kuruyemiş', terms: ['kuruyemis', 'nuts', 'tree nut', 'nut paste', 'praline', 'pralin', 'nugat', 'nougat', 'gianduja'] },
];

const SOY: Rule[] = [
  { label: 'soya', terms: ['soya', 'soy ', 'soy,', 'soy.', 'soybean', 'soja', 'edamame', 'tofu', 'tempeh', 'miso'] },
];

// ------------------------------------------------------------ özel kod tabloları
// E-kodları: (animal = kesin hayvansal, maybe = kaynağa bağlı, gluten = glüten kaynağı olabilir)

const E_ANIMAL: Record<string, string> = {
  e120: 'E120 karmin (böcek)',
  e441: 'E441 jelatin',
  e542: 'E542 kemik fosfatı',
  e901: 'E901 balmumu',
  e904: 'E904 gomalak',
  e913: 'E913 lanolin',
  e1105: 'E1105 lizozim (yumurta)',
};
const E_MAYBE: Record<string, string> = {
  e422: 'E422 gliserol',
  e430: 'E430 / yağ asidi türevi',
  e431: 'E431 / yağ asidi türevi',
  e432: 'E432 / yağ asidi türevi',
  e433: 'E433 / yağ asidi türevi',
  e434: 'E434 / yağ asidi türevi',
  e435: 'E435 / yağ asidi türevi',
  e436: 'E436 / yağ asidi türevi',
  e470: 'E470 yağ asidi tuzları',
  e471: 'E471 mono/digliserit',
  e472: 'E472 yağ asidi esterleri',
  e473: 'E473 / yağ asidi esteri',
  e475: 'E475 / yağ asidi esteri',
  e476: 'E476 / yağ asidi esteri',
  e477: 'E477 / yağ asidi esteri',
  e481: 'E481 stearoil laktilat',
  e482: 'E482 stearoil laktilat',
  e491: 'E491 / sorbitan esteri',
  e570: 'E570 stearik asit',
  e572: 'E572 magnezyum stearat',
  e627: 'E627 guanilat',
  e631: 'E631 inosinat',
  e635: 'E635 ribonükleotid',
  e920: 'E920 L-sistein',
  e966: 'E966 laktitol (süt kaynaklı)',
  e322: 'E322 lesitin',
};
const E_DAIRY: Record<string, string> = { e966: 'E966 laktitol (süt şekeri)', e270: 'E270 laktik asit (genelde bitkisel)' };

// ------------------------------------------------------- Open Food Facts etiketleri

const ALLERGEN_MAP: Partial<Record<DietId, string[]>> = {
  gluten: ['en:gluten'],
  dairy: ['en:milk'],
  egg: ['en:eggs'],
  nuts: ['en:nuts', 'en:peanuts'],
  soy: ['en:soybeans'],
};

// ------------------------------------------------------------------- ana motor

type Bucket = { no: Set<string>; maybe: Set<string> };
const bucket = (): Bucket => ({ no: new Set(), maybe: new Set() });

export function analyze(input: AnalysisInput): Analysis {
  const raw = input.ingredientsText?.trim() ?? '';
  const norm = normalize(raw);
  const hasText = norm.length >= 3;
  const { main, trace } = splitTrace(norm);

  const b: Record<DietId, Bucket> = {
    vegan: bucket(),
    vegetarian: bucket(),
    gluten: bucket(),
    dairy: bucket(),
    egg: bucket(),
    nuts: bucket(),
    soy: bucket(),
  };

  if (hasText) {
    const meat = matchRules(main, MEAT_FISH);
    const dairy = matchRules(main, DAIRY);
    const dairyMaybe = matchRules(main, DAIRY_MAYBE);
    const egg = matchRules(main, EGG);
    const eggMaybe = matchRules(main, EGG_MAYBE);
    const bee = matchRules(main, HONEY_BEE);
    const veganMaybe = matchRules(main, VEGAN_MAYBE);
    const gluten = matchRules(main, GLUTEN);
    const glutenMaybe = matchRules(main, GLUTEN_MAYBE);
    const nuts = matchRules(main, NUTS);
    const soy = matchRules(main, SOY);

    meat.forEach((r) => {
      b.vegetarian.no.add(r);
      b.vegan.no.add(r);
    });
    dairy.forEach((r) => {
      b.dairy.no.add(r);
      b.vegan.no.add(r);
    });
    dairyMaybe.forEach((r) => b.dairy.maybe.add(r));
    egg.forEach((r) => {
      b.egg.no.add(r);
      b.vegan.no.add(r);
    });
    eggMaybe.forEach((r) => {
      b.egg.maybe.add(r);
      b.vegan.maybe.add(r);
    });
    bee.forEach((r) => b.vegan.no.add(r));
    veganMaybe.forEach((r) => b.vegan.maybe.add(r));
    gluten.forEach((r) => b.gluten.no.add(r));
    glutenMaybe.forEach((r) => b.gluten.maybe.add(r));
    nuts.forEach((r) => b.nuts.no.add(r));
    soy.forEach((r) => b.soy.no.add(r));
    if (soy.length) b.vegan.maybe.delete('lesitin (genelde soya, bazen yumurta)');

    // E-kodları
    for (const code of extractECodes(main)) {
      if (E_ANIMAL[code]) {
        b.vegan.no.add(E_ANIMAL[code]);
        if (['e120', 'e441', 'e542'].includes(code)) b.vegetarian.no.add(E_ANIMAL[code]);
        if (code === 'e1105') b.egg.no.add(E_ANIMAL[code]);
      } else if (E_MAYBE[code]) {
        b.vegan.maybe.add(E_MAYBE[code]);
      }
      if (E_DAIRY[code] && code === 'e966') b.dairy.maybe.add(E_DAIRY[code]);
    }

    // Çapraz bulaşma / iz miktarı bölümü: sadece "belirsiz" üretir.
    if (trace) {
      const t = (rules: Rule[]) => matchRules(trace, rules).map((r) => `iz miktarı: ${r}`);
      t(DAIRY).forEach((r) => {
        b.dairy.maybe.add(r);
        b.vegan.maybe.add(r);
      });
      t(EGG).forEach((r) => {
        b.egg.maybe.add(r);
        b.vegan.maybe.add(r);
      });
      t(GLUTEN).forEach((r) => b.gluten.maybe.add(r));
      t(NUTS).forEach((r) => b.nuts.maybe.add(r));
      t(SOY).forEach((r) => b.soy.maybe.add(r));
    }

    // "Glütensiz / gluten free" beyanı: ana bölümde glüten kaynağı yoksa güven artar.
    if (/glutensiz|gluten[\s-]?free/.test(norm) && b.gluten.no.size === 0) {
      b.gluten.maybe.delete('yulaf (çapraz bulaşma olabilir)');
    }
  }

  // Open Food Facts'in yapılandırılmış verisi: yalnızca daha katı sonuç üretebilir.
  const tags = input.analysisTags ?? [];
  const hasOffVegan = tags.some((t) => t.startsWith('en:') && t.includes('vegan'));
  if (tags.includes('en:non-vegan')) b.vegan.no.add('Open Food Facts: vegan değil');
  else if (tags.includes('en:maybe-vegan')) b.vegan.maybe.add('Open Food Facts: vegan olabilir (emin değil)');
  if (tags.includes('en:non-vegetarian')) b.vegetarian.no.add('Open Food Facts: vejetaryen değil');
  else if (tags.includes('en:maybe-vegetarian')) b.vegetarian.maybe.add('Open Food Facts: vejetaryen olabilir (emin değil)');

  const allergens = input.allergens ?? [];
  const traces = input.traces ?? [];
  (Object.keys(ALLERGEN_MAP) as DietId[]).forEach((id) => {
    ALLERGEN_MAP[id]!.forEach((tag) => {
      if (allergens.includes(tag)) b[id].no.add(`alerjen beyanı: ${tag.replace('en:', '')}`);
      else if (traces.includes(tag)) b[id].maybe.add(`iz miktarı beyanı: ${tag.replace('en:', '')}`);
    });
  });
  if (allergens.includes('en:milk') || allergens.includes('en:eggs')) {
    b.vegan.no.add(allergens.includes('en:milk') ? 'alerjen beyanı: süt' : 'alerjen beyanı: yumurta');
  }

  const hasStructured = tags.length > 0 || allergens.length > 0;
  let matched = 0;
  const results: DietResult[] = DIETS.map((diet) => {
    const bk = b[diet.id];
    let verdict: Verdict;
    let reasons: string[];
    if (bk.no.size > 0) {
      verdict = 'no';
      reasons = [...bk.no];
      matched += 1;
    } else if (bk.maybe.size > 0) {
      verdict = 'maybe';
      reasons = [...bk.maybe];
    } else if (hasText || (hasStructured && (diet.id === 'vegan' ? hasOffVegan : true))) {
      verdict = 'yes';
      reasons = [];
    } else {
      verdict = 'unknown';
      reasons = ['İçerik bilgisi yok'];
    }
    return { diet, verdict, reasons };
  });

  return { results, hasText, matchedIngredients: matched };
}

// ------------------------------------------------------ kullanıcı profiline göre özet

export type Fit = { status: 'ok' | 'warn' | 'bad' | 'none'; title: string; detail: string };

export function fitForProfile(analysis: Analysis, selected: DietId[]): Fit {
  if (selected.length === 0) {
    return { status: 'none', title: 'Analiz hazır', detail: 'Profil sekmesinden diyetini seçersen sana özel sonuç göstereriz.' };
  }
  const chosen = analysis.results.filter((r) => selected.includes(r.diet.id));
  const bad = chosen.filter((r) => r.verdict === 'no');
  const maybe = chosen.filter((r) => r.verdict === 'maybe' || r.verdict === 'unknown');
  if (bad.length) {
    return {
      status: 'bad',
      title: 'Sana uygun değil',
      detail: `${bad.map((r) => r.diet.short).join(', ')} kriterine uymuyor.`,
    };
  }
  if (maybe.length) {
    return {
      status: 'warn',
      title: 'Emin olunamadı',
      detail: `${maybe.map((r) => r.diet.short).join(', ')} için ambalajı kontrol et.`,
    };
  }
  return { status: 'ok', title: 'Sana uygun', detail: 'Seçtiğin tüm kriterlere uyuyor.' };
}
