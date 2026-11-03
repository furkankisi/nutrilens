/**
 * Etiket fotoğrafından yazı okuma (OCR) — OCR.space API.
 * Ücretsiz anahtar: https://ocr.space/ocrapi/freekey  →  .env: EXPO_PUBLIC_OCR_SPACE_KEY
 * Anahtar verilmezse çok sınırlı "helloworld" demo anahtarı kullanılır.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const KEY = process.env.EXPO_PUBLIC_OCR_SPACE_KEY || 'helloworld';

export class OcrError extends Error {}

/** Fotoğrafı OCR.space ücretsiz sınırının (1 MB) altına indirir. */
async function prepare(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri).resize({ width: 1500 });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!out.base64) throw new OcrError('Fotoğraf işlenemedi.');
  return out.base64;
}

export async function readTextFromImage(uri: string): Promise<string> {
  const base64 = await prepare(uri);
  const body = new FormData();
  body.append('base64Image', `data:image/jpeg;base64,${base64}`);
  body.append('language', 'tur');
  body.append('OCREngine', '1');
  body.append('scale', 'true');
  body.append('detectOrientation', 'true');
  body.append('isOverlayRequired', 'false');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: KEY },
      body,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new OcrError(`OCR servisi hata verdi (${res.status}).`);
    const json = await res.json();
    if (json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : String(json.ErrorMessage ?? '');
      throw new OcrError(msg || 'Yazı okunamadı.');
    }
    const text: string = (json.ParsedResults ?? []).map((r: any) => r.ParsedText ?? '').join('\n').trim();
    if (text.length < 5) throw new OcrError('Fotoğrafta okunabilir yazı bulunamadı. Daha yakın ve aydınlık çekmeyi dene.');
    return text;
  } catch (e: any) {
    if (e instanceof OcrError) throw e;
    if (e?.name === 'AbortError') throw new OcrError('OCR zaman aşımına uğradı.');
    throw new OcrError('OCR servisine ulaşılamadı. İnternetini kontrol et veya içeriği elle yaz.');
  } finally {
    clearTimeout(timer);
  }
}

/** İçindekiler bölümünü yakalamaya çalışır; bulamazsa tüm metni döndürür. */
export function extractIngredientsSection(text: string): string {
  const flat = text.replace(/\s+/g, ' ');
  const m = flat.match(/(i[cç]indekiler|ingredients|i[cç]erik)\s*[:：]?\s*(.+)/i);
  return (m ? m[2] : flat).trim();
}
