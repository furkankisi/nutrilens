import { Platform } from 'react-native';

export const colors = {
  bg: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EEE7',
  ink: '#0E1A14',
  inkSoft: '#2B3A32',
  muted: '#6B7A72',
  border: '#E7E5DE',
  primary: '#0F8A5F',
  primaryDark: '#0B3D2E',
  primarySoft: '#E3F4EC',
  gold: '#B8924A',
  ok: '#12A150',
  okSoft: '#E3F5EA',
  warn: '#D98E04',
  warnSoft: '#FDF3DC',
  bad: '#D93A3A',
  badSoft: '#FBE7E7',
  unknown: '#8A958F',
  unknownSoft: '#EEF0EE',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0E1A14',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 3 },
}) as object;

export const font = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8, color: colors.ink },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.ink },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.inkSoft, lineHeight: 21 },
  caption: { fontSize: 12.5, fontWeight: '500' as const, color: colors.muted },
};

// Alt tab bar yüksekliği: içerikler bunun kadar boşluk bırakır.
export const TAB_BAR_SPACE = 110;
