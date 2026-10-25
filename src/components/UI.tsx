import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Product } from '../lib/off';
import { colors, font, radius, shadow } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function PrimaryButton({
  title,
  icon,
  onPress,
  loading,
  variant = 'primary',
  style,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'soft' | 'ghost';
  style?: ViewStyle;
}) {
  const bg = variant === 'primary' ? colors.primaryDark : variant === 'soft' ? colors.primarySoft : 'transparent';
  const fg = variant === 'primary' ? '#fff' : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, style]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={19} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: !!active }}>
      {icon && <Ionicons name={icon} size={15} color={active ? '#fff' : colors.inkSoft} />}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const NS_COLORS: Record<string, string> = { a: '#1E8F4E', b: '#7AC547', c: '#F2C11B', d: '#EE8A1F', e: '#E03C31' };

export function NutriBadge({ grade }: { grade?: string }) {
  if (!grade) return null;
  return (
    <View style={[styles.ns, { backgroundColor: NS_COLORS[grade] ?? colors.unknown }]}>
      <Text style={styles.nsText}>{grade.toUpperCase()}</Text>
    </View>
  );
}

export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={styles.cardImgWrap}>
        {product.thumb ? (
          <Image source={{ uri: product.thumb }} style={styles.cardImg} contentFit="contain" transition={200} />
        ) : (
          <Ionicons name="image-outline" size={30} color={colors.muted} />
        )}
        {product.nutriscore && (
          <View style={styles.cardBadge}>
            <NutriBadge grade={product.nutriscore} />
          </View>
        )}
      </View>
      <Text style={styles.cardBrand} numberOfLines={1}>
        {product.brand ?? ' '}
      </Text>
      <Text style={styles.cardName} numberOfLines={2}>
        {product.name}
      </Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[font.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[font.body, { textAlign: 'center', color: colors.muted }]}>{message}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 54, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  ns: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  nsText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardImgWrap: { height: 120, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  cardImg: { width: '100%', height: '100%' },
  cardBadge: { position: 'absolute', top: 8, right: 8 },
  cardBrand: { fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  cardName: { fontSize: 14.5, fontWeight: '700', color: colors.ink, lineHeight: 19, minHeight: 38 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
