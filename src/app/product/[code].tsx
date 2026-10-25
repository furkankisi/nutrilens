import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalysisCard } from '../../components/AnalysisCard';
import { EmptyState, NutriBadge, PrimaryButton } from '../../components/UI';
import { analyze } from '../../lib/analyzer';
import { ApiError, getProductByBarcode, type Product } from '../../lib/off';
import { useStore } from '../../lib/store';
import { colors, font, radius, shadow } from '../../theme';

type State = { kind: 'loading' } | { kind: 'ok'; product: Product } | { kind: 'notfound' } | { kind: 'error'; message: string };

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { diets, addHistory } = useStore();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const p = await getProductByBarcode(String(code));
      if (!p) return setState({ kind: 'notfound' });
      setState({ kind: 'ok', product: p });
      addHistory({ id: String(code), name: p.name, brand: p.brand, thumb: p.thumb, source: 'barcode' });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof ApiError ? e.message : 'Ürün yüklenemedi.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const product = state.kind === 'ok' ? state.product : null;
  const analysis = useMemo(
    () =>
      product
        ? analyze({ ingredientsText: product.ingredientsText, analysisTags: product.analysisTags, allergens: product.allergens, traces: product.traces })
        : null,
    [product],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
        {state.kind === 'loading' && (
          <View style={{ paddingTop: 120, alignItems: 'center', gap: 14 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={font.caption}>Ürün aranıyor…</Text>
          </View>
        )}

        {state.kind === 'error' && (
          <EmptyState
            icon="cloud-offline"
            title="Bağlanılamadı"
            message={state.message}
            action={<PrimaryButton title="Tekrar dene" icon="refresh" onPress={load} style={{ marginTop: 10 }} />}
          />
        )}

        {state.kind === 'notfound' && (
          <EmptyState
            icon="help-circle"
            title="Ürün sistemde yok"
            message={`${code} barkodlu ürün veritabanında bulunamadı. Etiketteki “İçindekiler” kısmını fotoğraflarsan içeriği okuyup analiz edelim.`}
            action={
              <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 14 }}>
                <PrimaryButton title="İçindekileri kameradan tara" icon="camera" onPress={() => router.push({ pathname: '/label', params: { code: String(code) } })} />
                <PrimaryButton title="Tekrar tara" icon="barcode-outline" variant="soft" onPress={back} />
              </View>
            }
          />
        )}

        {product && analysis && (
          <>
            <View style={styles.head}>
              <View style={styles.img}>
                {product.image ? <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={250} /> : <Ionicons name="image-outline" size={34} color={colors.muted} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
                <Text style={styles.name}>{product.name}</Text>
                <Text style={font.caption}>{[product.quantity, product.code].filter(Boolean).join(' · ')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <NutriBadge grade={product.nutriscore} />
                  {product.nova ? <Text style={styles.nova}>NOVA {product.nova}</Text> : null}
                </View>
              </View>
            </View>

            {!analysis.hasText && analysis.results.every((r) => r.verdict === 'unknown') ? (
              <View style={styles.noText}>
                <Ionicons name="document-text-outline" size={26} color={colors.warn} />
                <Text style={[font.body, { flex: 1 }]}>Bu ürün için içindekiler bilgisi eksik. Etiketi fotoğraflayarak analiz edebilirsin.</Text>
                <PrimaryButton title="Tara" icon="camera" onPress={() => router.push({ pathname: '/label', params: { code: product.code, title: product.name } })} style={{ height: 44 }} />
              </View>
            ) : (
              <AnalysisCard analysis={analysis} selected={diets} />
            )}

            {product.ingredientsText ? (
              <View style={styles.box}>
                <Text style={font.heading}>İçindekiler</Text>
                <Text style={[font.body, { marginTop: 6 }]}>{product.ingredientsText}</Text>
              </View>
            ) : null}

            <Nutrients p={product} />
          </>
        )}
      </ScrollView>

      <Pressable onPress={back} style={[styles.back, { top: insets.top + 8 }]} accessibilityLabel="Geri">
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function Nutrients({ p }: { p: Product }) {
  const n = p.nutrients;
  const rows: [string, number | undefined, string][] = [
    ['Enerji', n.energyKcal, 'kcal'],
    ['Yağ', n.fat, 'g'],
    ['  Doymuş yağ', n.saturatedFat, 'g'],
    ['Karbonhidrat', n.carbs, 'g'],
    ['  Şeker', n.sugars, 'g'],
    ['Lif', n.fiber, 'g'],
    ['Protein', n.protein, 'g'],
    ['Tuz', n.salt, 'g'],
  ];
  const shown = rows.filter(([, v]) => v !== undefined);
  if (!shown.length) return null;
  return (
    <View style={styles.box}>
      <Text style={font.heading}>Besin değerleri · 100 g</Text>
      {shown.map(([label, v, unit], i) => (
        <View key={label} style={[styles.nRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Text style={[font.body, label.startsWith('  ') && { color: colors.muted, paddingLeft: 12 }]}>{label.trim()}</Text>
          <Text style={{ fontWeight: '700', color: colors.ink }}>
            {Math.round((v as number) * 10) / 10} {unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  head: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  img: { width: 118, height: 138, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow },
  brand: { fontSize: 13, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  name: { fontSize: 21, fontWeight: '800', color: colors.ink, letterSpacing: -0.4, lineHeight: 26 },
  nova: { fontSize: 12, fontWeight: '800', color: colors.inkSoft, backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  noText: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.warnSoft },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  nRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
});
