import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Product } from '../lib/off';
import { colors, font, paletteFor, radius, shadow } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function PrimaryButton({ title, icon, onPress, loading, variant = 'primary', style }: {
  title: string; icon?: IconName; onPress: () => void; loading?: boolean; variant?: 'primary' | 'soft' | 'ghost'; style?: ViewStyle;
}) {
  const bg = variant === 'primary' ? colors.primaryDark : variant === 'soft' ? colors.primarySoft : 'transparent';
  const fg = variant === 'primary' ? '#fff' : colors.primaryDark;
  return (
    <Pressable onPress={onPress} disabled={loading} accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (<>
        {icon && <Ionicons name={icon} size={22} color={fg} />}
        <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
      </>)}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, color = colors.primary }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.chip, active && { backgroundColor: color, borderColor: color }, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      {icon && (
        <View style={[styles.chipIcon, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : color + '22' }]}>
          <Ionicons name={icon} size={16} color={active ? '#fff' : color} />
        </View>
      )}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const NS: Record<string, string> = { a: '#00A651', b: '#7AC70C', c: '#FFC400', d: '#FF8200', e: '#F0384A' };

export function NutriBadge({ grade, size = 28 }: { grade?: string; size?: number }) {
  if (!grade) return null;
  return (
    <View style={[styles.ns, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: NS[grade] ?? colors.unknown }]}>
      <Text style={[styles.nsText, { fontSize: size * 0.56 }]}>{grade.toUpperCase()}</Text>
    </View>
  );
}

/** Izgara kartı: renkli zemin + beyaz "tabak" üzerinde ürün. */
export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const pal = paletteFor(product.code);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: pal.soft, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={[styles.blob, { backgroundColor: pal.a, opacity: 0.22 }]} />
      <View style={styles.plate}>
        {product.thumb ? (
          <Image source={{ uri: product.thumb }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={250} />
        ) : (
          <Ionicons name="image-outline" size={34} color={colors.muted} />
        )}
      </View>
      {product.nutriscore && <View style={styles.cardBadge}><NutriBadge grade={product.nutriscore} size={30} /></View>}
      <Text style={[styles.cardBrand, { color: pal.ink }]} numberOfLines={1}>{product.brand ?? ' '}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
    </Pressable>
  );
}

/** Üstteki büyük "öne çıkan" kart. */
export function HeroCard({ product, onPress, width }: { product: Product; onPress: () => void; width: number }) {
  const pal = paletteFor(product.code);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <LinearGradient colors={[pal.a, pal.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.circle, { width: 220, height: 220, top: -70, right: -70 }]} />
        <View style={[styles.circle, { width: 120, height: 120, bottom: 40, left: -50 }]} />
        <View style={styles.heroTop}>
          <View style={styles.heroPill}><Text style={styles.heroPillText} numberOfLines={1}>{product.brand ?? 'Ürün'}</Text></View>
          <NutriBadge grade={product.nutriscore} size={34} />
        </View>
        <View style={styles.heroPlate}>
          {product.thumb ? <Image source={{ uri: product.image ?? product.thumb }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={300} /> : null}
        </View>
        <Text style={styles.heroName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.heroCta}>
          <Text style={[styles.heroCtaText, { color: pal.ink }]}>İçeriği analiz et</Text>
          <Ionicons name="arrow-forward" size={18} color={pal.ink} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={36} color={colors.primary} /></View>
      <Text style={[font.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[font.body, { textAlign: 'center', color: colors.muted }]}>{message}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 58, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 24 },
  btnText: { fontSize: 18, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 8, paddingRight: 16, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  chipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, fontWeight: '800', color: colors.inkSoft },
  ns: { alignItems: 'center', justifyContent: 'center' },
  nsText: { color: '#fff', fontWeight: '900' },
  card: { flex: 1, borderRadius: 28, padding: 12, overflow: 'hidden' },
  blob: { position: 'absolute', width: 130, height: 130, borderRadius: 65, top: -34, right: -34 },
  plate: { height: 138, borderRadius: 22, backgroundColor: '#fff', padding: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadow },
  cardBadge: { position: 'absolute', top: 20, right: 20 },
  cardBrand: { fontSize: 13.5, fontWeight: '800', marginBottom: 2 },
  cardName: { fontSize: 16.5, fontWeight: '800', color: colors.ink, lineHeight: 21, minHeight: 42 },
  hero: { height: 396, borderRadius: 36, padding: 18, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, maxWidth: '70%' },
  heroPillText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  heroPlate: { height: 170, marginTop: 14, marginHorizontal: 22, borderRadius: 28, backgroundColor: '#fff', padding: 10, transform: [{ rotate: '-4deg' }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  heroName: { color: '#fff', fontSize: 23, fontWeight: '900', letterSpacing: -0.4, marginTop: 16, lineHeight: 28 },
  heroCta: { position: 'absolute', left: 18, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, height: 44, borderRadius: 22 },
  heroCtaText: { fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 52, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
