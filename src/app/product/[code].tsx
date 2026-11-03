import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalysisCard } from '../../components/AnalysisCard';
import { FadeUp } from '../../components/FadeUp';
import { EmptyState, NutriBadge, PrimaryButton } from '../../components/UI';
import { analyze } from '../../lib/analyzer';
import { normalizeBarcode } from '../../lib/ean';
import { prepareIngredients } from '../../lib/ingredients';
import { customToProduct, deletePhoto } from '../../lib/photos';
import { ApiError, getProductByBarcode, type Product } from '../../lib/off';
import { useStore } from '../../lib/store';
import { colors, font, paletteFor, radius, shadow } from '../../theme';

type State = { kind: 'loading' } | { kind: 'ok'; product: Product } | { kind: 'notfound' } | { kind: 'error'; message: string };

const NOVA_TEXT: Record<number, string> = { 1: 'İşlenmemiş / minimum işlenmiş', 2: 'İşlenmiş mutfak malzemesi', 3: 'İşlenmiş gıda', 4: 'Ultra işlenmiş gıda' };
const NS_TEXT: Record<string, string> = { a: 'Çok iyi', b: 'İyi', c: 'Orta', d: 'Zayıf', e: 'Düşük' };

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { diets, addHistory, custom, removeCustom } = useStore();
  const customRef = useRef(custom);
  customRef.current = custom;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [analysisDone, setAnalysisDone] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setAnalysisDone(false);
    try {
      // Önce kullanıcının kendi ürünleri (kimlik ya da barkod eşleşmesi)
      const id = String(code);
      const mine = id.startsWith('my-')
        ? customRef.current.find((c) => c.id === id)
        : customRef.current.find((c) => c.barcode && normalizeBarcode(c.barcode) === normalizeBarcode(id));
      if (mine) {
        const cp = customToProduct(mine);
        setState({ kind: 'ok', product: cp });
        addHistory({ id: mine.id, name: cp.name, brand: cp.brand, thumb: cp.thumb, source: 'barcode' });
        return;
      }
      if (id.startsWith('my-')) return setState({ kind: 'notfound' });
      const p = await getProductByBarcode(id);
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
  const prepared = useMemo(() => (product ? prepareIngredients(product.ingredientsText, product.lang) : null), [product]);
  const analysis = useMemo(
    () =>
      product && prepared
        ? analyze({
            ingredientsText: prepared.forAnalysis,
            analysisTags: product.analysisTags,
            allergens: product.allergens,
            traces: product.traces,
            labels: product.labels,
            uncertain: !prepared.isTurkish && prepared.dropped > 0,
          })
        : null,
    [product, prepared],
  );

  const pal = paletteFor(String(code));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const noInfo = !!analysis && !analysis.hasText && analysis.results.every((r) => r.verdict === 'unknown');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>
        <LinearGradient colors={[pal.a, pal.b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 70 }]}>
          <View style={[styles.circle, { width: 300, height: 300, top: -90, right: -110 }]} />
          <View style={[styles.circle, { width: 160, height: 160, bottom: 60, left: -70 }]} />
          {product ? <HeroProduct product={product} analyzing={!analysisDone && !noInfo} /> : state.kind === 'loading' ? <HeroLoading /> : <View style={{ height: 120 }} />}
        </LinearGradient>

        <View style={styles.sheet}>
          {state.kind === 'error' && (
            <EmptyState icon="cloud-offline" title="Bağlanılamadı" message={state.message}
              action={<PrimaryButton title="Tekrar dene" icon="refresh" onPress={load} style={{ marginTop: 10 }} />} />
          )}

          {state.kind === 'notfound' && (
            <EmptyState icon="help-circle" title="Ürün sistemde yok"
              message={`${code} barkodlu ürün veritabanında bulunamadı. Etiketteki “İçindekiler” kısmını fotoğraflarsan içeriği okuyup analiz edelim.`}
              action={
                <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 14 }}>
                  <PrimaryButton title="Ürünü kendim ekle" icon="add-circle" onPress={() => router.push({ pathname: '/add-product', params: { barcode: String(code).startsWith('my-') ? '' : String(code) } })} />
                  <PrimaryButton title="Sadece içeriği analiz et" icon="camera" variant="soft" onPress={() => router.push({ pathname: '/label', params: { code: String(code) } })} />
                  <PrimaryButton title="Tekrar tara" icon="barcode-outline" variant="ghost" onPress={back} />
                </View>
              } />
          )}

          {product && analysis && prepared && (
            <>
              {product.custom && (
                <FadeUp delay={350}>
                  <View style={[styles.mine, { backgroundColor: pal.soft }]}>
                    <Ionicons name="person-circle" size={22} color={pal.ink} />
                    <Text style={{ color: pal.ink, fontWeight: '800', fontSize: 15.5 }}>Senin eklediğin ürün</Text>
                  </View>
                </FadeUp>
              )}
              {noInfo ? (
                <View style={styles.noText}>
                  <Ionicons name="document-text-outline" size={32} color={colors.warn} />
                  <Text style={[font.body, { flex: 1, color: colors.ink }]}>Bu ürün için içindekiler bilgisi eksik. Etiketi fotoğraflayarak analiz edebilirsin.</Text>
                  <PrimaryButton title="Tara" icon="camera" onPress={() => router.push({ pathname: '/label', params: { code: product.code, title: product.name } })} style={{ height: 50 }} />
                </View>
              ) : (
                <>
                  <FadeUp delay={500}><Text style={styles.h}>Diyet analizi</Text></FadeUp>
                  <AnalysisCard analysis={analysis} selected={diets} startDelay={900} onDone={() => setAnalysisDone(true)} />
                </>
              )}

              {prepared.chips.length > 0 && (
                <FadeUp delay={noInfo ? 300 : 1200 + 7 * 620} style={styles.box}>
                  <Text style={styles.h}>İçindekiler</Text>
                  <View style={styles.chips}>
                    {prepared.chips.map((c, i) => (
                      <View key={`${c}-${i}`} style={[styles.ing, { backgroundColor: pal.soft }]}>
                        <Text style={[styles.ingText, { color: pal.ink }]}>{c}</Text>
                      </View>
                    ))}
                  </View>
                  {prepared.dropped > 0 && <Text style={[font.caption, { marginTop: 12 }]}>Bazı içerikler çevrilemediği için gösterilmedi ({prepared.dropped}).</Text>}
                </FadeUp>
              )}

              {product.custom?.ingredientsImage ? (
                <FadeUp delay={noInfo ? 300 : 1200 + 7 * 620} style={styles.box}>
                  <Text style={styles.h}>İçerik fotoğrafı</Text>
                  <Image source={{ uri: product.custom.ingredientsImage }} style={styles.ingPhoto} contentFit="cover" transition={250} />
                </FadeUp>
              ) : null}

              <Nutrients p={product} />

              {product.custom && (
                <View style={{ gap: 10 }}>
                  <PrimaryButton title="Düzenle" icon="create-outline" variant="soft" onPress={() => router.push({ pathname: '/add-product', params: { id: product.custom!.id } })} />
                  <PrimaryButton
                    title="Ürünü sil"
                    icon="trash-outline"
                    variant="ghost"
                    onPress={() =>
                      Alert.alert('Ürünü sil', `“${product.name}” silinecek.`, [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: () => {
                            const c = custom.find((x) => x.id === product.custom!.id);
                            deletePhoto(c?.frontFile);
                            deletePhoto(c?.ingredientsFile);
                            removeCustom(product.custom!.id);
                            back();
                          },
                        },
                      ])
                    }
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={back} style={[styles.back, { top: insets.top + 8 }]} accessibilityLabel="Geri">
        {Platform.OS === 'ios' ? <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />}
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** Ürün üstten süzülerek gelir; analiz sürerken üzerinde lazer tarama çizgisi dolaşır. */
function HeroProduct({ product, analyzing }: { product: Product; analyzing: boolean }) {
  const enter = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 12 }),
      Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [enter, text]);

  useEffect(() => {
    if (!analyzing) {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), 700);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [analyzing, sweep, fade]);

  const PH = 220;
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={[
          styles.plate,
          { height: PH, opacity: enter, transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            { rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-3deg'] }) },
          ] },
        ]}
      >
        {product.image ? <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={250} /> : <Ionicons name="image-outline" size={48} color={colors.muted} />}
        <Animated.View pointerEvents="none" style={[styles.laser, { opacity: fade, transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [8, PH - 14] }) }] }]} />
      </Animated.View>

      <Animated.View style={{ alignItems: 'center', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.name}>{product.name}</Text>
        {product.quantity ? <Text style={styles.qty}>{product.quantity}</Text> : null}
        <View style={styles.badges}>
          {product.nutriscore && (
            <View style={styles.badge}>
              <NutriBadge grade={product.nutriscore} size={30} />
              <Text style={styles.badgeText}>Beslenme puanı · {NS_TEXT[product.nutriscore]}</Text>
            </View>
          )}
          {product.nova ? (
            <View style={styles.badge}>
              <Ionicons name="flask" size={18} color="#fff" />
              <Text style={styles.badgeText}>{NOVA_TEXT[product.nova] ?? `NOVA ${product.nova}`}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

function HeroLoading() {
  return (
    <View style={{ height: 240, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Ürün aranıyor…</Text>
    </View>
  );
}

function level(v: number, mid: number, high: number): { text: string; color: string } {
  if (v > high) return { text: 'Yüksek', color: colors.bad };
  if (v > mid) return { text: 'Orta', color: colors.warn };
  return { text: 'Düşük', color: colors.ok };
}

function Nutrients({ p }: { p: Product }) {
  const n = p.nutrients;
  const rows: { label: string; v?: number; unit: string; lvl?: { text: string; color: string } }[] = [
    { label: 'Enerji', v: n.energyKcal, unit: 'kcal' },
    { label: 'Yağ', v: n.fat, unit: 'g', lvl: n.fat !== undefined ? level(n.fat, 3, 17.5) : undefined },
    { label: 'Doymuş yağ', v: n.saturatedFat, unit: 'g', lvl: n.saturatedFat !== undefined ? level(n.saturatedFat, 1.5, 5) : undefined },
    { label: 'Karbonhidrat', v: n.carbs, unit: 'g' },
    { label: 'Şeker', v: n.sugars, unit: 'g', lvl: n.sugars !== undefined ? level(n.sugars, 5, 22.5) : undefined },
    { label: 'Lif', v: n.fiber, unit: 'g' },
    { label: 'Protein', v: n.protein, unit: 'g' },
    { label: 'Tuz', v: n.salt, unit: 'g', lvl: n.salt !== undefined ? level(n.salt, 0.3, 1.5) : undefined },
  ].filter((r) => r.v !== undefined);
  if (!rows.length) return null;
  return (
    <FadeUp delay={200} style={styles.box}>
      <Text style={styles.h}>Besin değerleri</Text>
      <Text style={[font.caption, { marginBottom: 6 }]}>100 gram için</Text>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.nRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Text style={[font.body, { flex: 1, fontWeight: '600' }]}>{r.label}</Text>
          {r.lvl && (
            <View style={[styles.lvl, { backgroundColor: r.lvl.color + '22' }]}>
              <Text style={{ color: r.lvl.color, fontWeight: '800', fontSize: 13 }}>{r.lvl.text}</Text>
            </View>
          )}
          <Text style={styles.nVal}>{Math.round((r.v as number) * 10) / 10} {r.unit}</Text>
        </View>
      ))}
    </FadeUp>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 56, paddingHorizontal: 20, overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  back: { position: 'absolute', left: 16, width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  plate: { width: 230, borderRadius: 34, backgroundColor: '#fff', padding: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  laser: { position: 'absolute', left: 10, right: 10, top: 0, height: 4, borderRadius: 2, backgroundColor: '#00E39A', shadowColor: '#00E39A', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  brand: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 24 },
  name: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center', marginTop: 4, lineHeight: 35 },
  qty: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700', marginTop: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.22)', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 22 },
  badgeText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  sheet: { paddingHorizontal: 20, paddingTop: 26, gap: 18 },
  h: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, color: colors.ink },
  mine: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  ingPhoto: { width: '100%', height: 190, borderRadius: 18, marginTop: 8, backgroundColor: colors.surfaceAlt },
  noText: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.lg, backgroundColor: colors.warnSoft, flexWrap: 'wrap' },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 8, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  ing: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  ingText: { fontSize: 15.5, fontWeight: '700' },
  nRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  nVal: { fontWeight: '900', fontSize: 17, color: colors.ink, minWidth: 82, textAlign: 'right' },
  lvl: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
});
