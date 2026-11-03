/**
 * Makro (protein / karbonhidrat / yağ) ve VKİ hesaplayıcıları.
 * Genel bilgilendirme amaçlıdır, tıbbi tavsiye değildir.
 */
import type { BodyProfile } from './store';

export const ACTIVITY = [
  { label: 'Hareketsiz', hint: 'Masa başı, az hareket', factor: 1.2 },
  { label: 'Hafif aktif', hint: 'Haftada 1-3 spor', factor: 1.375 },
  { label: 'Orta aktif', hint: 'Haftada 3-5 spor', factor: 1.55 },
  { label: 'Çok aktif', hint: 'Haftada 6-7 spor', factor: 1.725 },
  { label: 'Ekstra aktif', hint: 'Günde 2 antrenman / ağır iş', factor: 1.9 },
] as const;

export const GOALS = [
  { id: 'lose', label: 'Kilo ver', kcalAdj: -0.2, protein: 2.0 },
  { id: 'keep', label: 'Kilonu koru', kcalAdj: 0, protein: 1.6 },
  { id: 'gain', label: 'Kilo al', kcalAdj: 0.12, protein: 1.8 },
] as const;

export const num = (s: string): number => {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export type Macros = {
  kcal: number;
  bmr: number;
  tdee: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  perKg: { protein: number; carbs: number; fat: number };
};

export function validBody(b: BodyProfile): { weight: boolean; height: boolean; age: boolean } {
  const w = num(b.weight);
  const h = num(b.height);
  const a = num(b.age);
  return { weight: w >= 25 && w <= 300, height: h >= 100 && h <= 250, age: a >= 14 && a <= 100 };
}

/** Mifflin-St Jeor + aktivite çarpanı; protein kg başına, yağ kalorinin %27'si (alt sınır 0,6 g/kg), kalan karbonhidrat. */
export function calcMacros(b: BodyProfile): Macros | null {
  const v = validBody(b);
  if (!v.weight || !v.height || !v.age) return null;
  const w = num(b.weight);
  const h = num(b.height);
  const a = num(b.age);
  const bmr = 10 * w + 6.25 * h - 5 * a + (b.sex === 'm' ? 5 : -161);
  const tdee = bmr * ACTIVITY[b.activity].factor;
  const goal = GOALS.find((g) => g.id === b.goal) ?? GOALS[1];
  // Çok düşük kalori önerisini engelle: hedef BMR'nin altına inmesin
  const kcal = Math.max(tdee * (1 + goal.kcalAdj), bmr);
  const protein = goal.protein * w;
  const fat = Math.max((kcal * 0.27) / 9, 0.6 * w);
  const carbs = Math.max((kcal - protein * 4 - fat * 9) / 4, 0);
  const total = protein * 4 + fat * 9 + carbs * 4 || 1;
  return {
    kcal: Math.round(kcal / 10) * 10,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    proteinPct: Math.round(((protein * 4) / total) * 100),
    carbsPct: Math.round(((carbs * 4) / total) * 100),
    fatPct: Math.round(((fat * 9) / total) * 100),
    perKg: { protein: +(protein / w).toFixed(1), carbs: +(carbs / w).toFixed(1), fat: +(fat / w).toFixed(1) },
  };
}

export type Bmi = {
  value: number;
  label: string;
  color: string;
  note: string;
  idealMin: number;
  idealMax: number;
  diffKg: number; // + ise ideal aralığa girmek için verilmesi, - ise alınması gereken
};

export const BMI_STEPS = [
  { max: 16, label: 'Ciddi zayıf', color: '#3B82F6' },
  { max: 18.5, label: 'Zayıf', color: '#38BDF8' },
  { max: 25, label: 'Normal', color: '#00B578' },
  { max: 30, label: 'Fazla kilolu', color: '#F59E0B' },
  { max: 35, label: 'Obez (1. derece)', color: '#F97316' },
  { max: 999, label: 'Obez (2. derece ve üzeri)', color: '#F0384A' },
] as const;

export function calcBmi(b: BodyProfile): Bmi | null {
  const v = validBody(b);
  if (!v.weight || !v.height) return null;
  const w = num(b.weight);
  const hm = num(b.height) / 100;
  const value = w / (hm * hm);
  const step = BMI_STEPS.find((s) => value < s.max)!;
  const idealMin = 18.5 * hm * hm;
  const idealMax = 24.9 * hm * hm;
  const diffKg = w > idealMax ? -(w - idealMax) : w < idealMin ? idealMin - w : 0;
  const note =
    value < 18.5
      ? 'Ağırlığın ideal aralığın altında. Dengeli ve yeterli beslenmeye dikkat et.'
      : value < 25
        ? 'Ağırlığın sağlıklı aralıkta. Böyle devam!'
        : 'Ağırlığın ideal aralığın üzerinde. Dengeli beslenme ve düzenli hareket yardımcı olur.';
  return { value: Math.round(value * 10) / 10, label: step.label, color: step.color, note, idealMin: Math.round(idealMin * 10) / 10, idealMax: Math.round(idealMax * 10) / 10, diffKg: Math.round(diffKg * 10) / 10 };
}
