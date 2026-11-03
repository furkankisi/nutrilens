import { Platform } from 'react-native';

export const colors = {
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF0EB',
  ink: '#0A1A12',
  inkSoft: '#26382E',
  muted: '#5F7267',
  border: '#E1E8E2',
  primary: '#00B578',
  primaryDark: '#053B28',
  primarySoft: '#D8F8EA',
  gold: '#F2A900',
  ok: '#00B25D',
  okSoft: '#DAF8E7',
  warn: '#F59E0B',
  warnSoft: '#FFF1CF',
  bad: '#F0384A',
  badSoft: '#FFE1E4',
  unknown: '#7C8A82',
  unknownSoft: '#EAEFEB',
};

/** Canlı renk paletleri: ürün kartları ve detay ekranı bunlardan seçer. */
export type Palette = { a: string; b: string; soft: string; ink: string };
export const palettes: Palette[] = [
  { a: '#00D084', b: '#00875A', soft: '#D6F8E8', ink: '#00694A' },
  { a: '#FF8A4C', b: '#F2452F', soft: '#FFE4D6', ink: '#C23217' },
  { a: '#FFC933', b: '#F29900', soft: '#FFF0C2', ink: '#9A6200' },
  { a: '#37B6FF', b: '#2563EB', soft: '#D9EEFF', ink: '#1D4FBF' },
  { a: '#9B7BFF', b: '#6D3FE0', soft: '#E6DEFF', ink: '#5530B8' },
  { a: '#FF6FA5', b: '#E0267A', soft: '#FFDDEB', ink: '#B01C61' },
];

export function paletteFor(seed: string | number): Palette {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = Platform.select({
  ios: { shadowColor: '#0A1A12', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  default: { elevation: 4 },
}) as object;

export const font = {
  display: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -1, color: colors.ink },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.ink },
  heading: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3, color: colors.ink },
  body: { fontSize: 16.5, fontWeight: '400' as const, color: colors.inkSoft, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '600' as const, color: colors.muted },
};
