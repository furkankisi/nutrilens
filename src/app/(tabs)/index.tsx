import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeUp } from '../../components/FadeUp';
import { Chip, EmptyState, HeroCard, PrimaryButton, ProductCard } from '../../components/UI';
import { customToProduct } from '../../lib/photos';
import { useStore } from '../../lib/store';
import { useTabBarHeight } from '../../lib/tabbar';
import { ApiError, browseCategory, CATEGORIES, searchProducts, type Product } from '../../lib/off';
import { colors, font } from '../../theme';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const { custom } = useStore();
  const { width: screenW } = useWindowDimensions();
  const heroW = Math.min(screenW - 60, 360);
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const req = useRef(0); // eski isteklerin sonucunu yok say

  const load = useCallback(
    async (opts: { reset: boolean; page: number; q: string; cat: string }) => {
      const id = ++req.current;
      if (opts.reset && !refreshing) setLoading(true);
      setError(null);
      try {
        const c = CATEGORIES.find((x) => x.id === opts.cat) ?? CATEGORIES[0];
        const res = opts.q.trim().length >= 2 ? await searchProducts(opts.q, opts.page) : await browseCategory(c.tag, opts.page);
        if (id !== req.current) return;
        setTotal(res.total);
        setItems((prev) => {
          if (opts.reset) return res.products;
          const seen = new Set(prev.map((p) => p.code));
          return [...prev, ...res.products.filter((p) => !seen.has(p.code))];
        });
        setPage(opts.page);
      } catch (e) {
        if (id !== req.current) return;
        setError(e instanceof ApiError ? e.message : 'Ürünler yüklenemedi.');
        if (opts.reset) setItems([]);
      } finally {
        if (id === req.current) {
          setLoading(false);
          setMore(false);
          setRefreshing(false);
        }
      }
    },
    [refreshing],
  );

  // Kategori / arama değişince (aramada 450ms bekleyerek) yeniden yükle
  useEffect(() => {
    const t = setTimeout(() => load({ reset: true, page: 1, q: query, cat }), query ? 450 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, query]);

  const mine = useMemo(() => custom.map(customToProduct), [custom]);
  const q = query.trim().toLowerCase();
  const mineMatches = useMemo(
    () => (q.length >= 2 ? mine.filter((p) => `${p.name} ${p.brand ?? ''}`.toLowerCase().includes(q)) : []),
    [mine, q],
  );
  const showHero = query.length < 2 && cat === 'all' && items.length >= 4;
  const heroItems = showHero ? items.slice(0, 6) : [];
  const gridItems = [...mineMatches, ...(showHero ? items.slice(6) : items)];
  const open = (p: Product) => router.push({ pathname: '/product/[code]', params: { code: p.code } });

  const header = (
    <View style={{ paddingTop: insets.top + 14, gap: 18, paddingBottom: 6 }}>
      <FadeUp>
        <View style={styles.hRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>NutriLens</Text>
            <Text style={font.display}>Ne yediğini{'\n'}bil.</Text>
          </View>
          <View style={styles.logo}>
            <Ionicons name="nutrition" size={28} color="#fff" />
          </View>
        </View>
      </FadeUp>

      <FadeUp delay={90}>
        <View style={styles.search}>
          <Ionicons name="search" size={22} color={colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ürün veya marka ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={Keyboard.dismiss}
          />
          {query.length > 0 && <Ionicons name="close-circle" size={22} color={colors.muted} onPress={() => setQuery('')} />}
        </View>
      </FadeUp>

      {query.length < 2 && (
        <FadeUp delay={140}>
          <View style={{ marginHorizontal: -20 }}>
            <View style={styles.rowHead}>
              <Text style={styles.section}>Ürünlerim</Text>
              <Text style={styles.link} onPress={() => router.push('/my-products')}>
                {mine.length > 0 ? 'Tümü' : ''}
              </Text>
            </View>
            {mine.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={styles.addBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addTitle}>Ürününü bulamadın mı?</Text>
                    <Text style={styles.addText}>Ön yüz ve içindekiler fotoğrafını çek, analiz edelim.</Text>
                  </View>
                  <View style={styles.addBtn}>
                    <Ionicons name="add" size={30} color="#fff" onPress={() => router.push('/add-product')} />
                  </View>
                </View>
              </View>
            ) : (
              <FlatList
                data={mine}
                horizontal
                keyExtractor={(p) => `m-${p.code}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                ListHeaderComponent={
                  <View style={styles.addTile}>
                    <Ionicons name="add-circle" size={38} color={colors.primary} onPress={() => router.push('/add-product')} />
                    <Text style={styles.addTileText}>Ürün ekle</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={{ width: 150 }}>
                    <ProductCard product={item} onPress={() => open(item)} />
                  </View>
                )}
              />
            )}
          </View>
        </FadeUp>
      )}

      {heroItems.length > 0 && (
        <View style={{ marginHorizontal: -20 }}>
          <Text style={[styles.section, { marginLeft: 20, marginBottom: 12 }]}>Öne çıkanlar</Text>
          <FlatList
            data={heroItems}
            horizontal
            keyExtractor={(p) => `h-${p.code}`}
            showsHorizontalScrollIndicator={false}
            snapToInterval={heroW + 14}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            renderItem={({ item, index }) => (
              <FadeUp delay={150 + index * 90} distance={30}>
                <HeroCard product={item} width={heroW} onPress={() => open(item)} />
              </FadeUp>
            )}
          />
        </View>
      )}

      {query.length < 2 && (
        <View style={{ marginHorizontal: -20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} active={cat === c.id} icon={c.icon as any} color={c.color} onPress={() => setCat(c.id)} />
            ))}
          </ScrollView>
        </View>
      )}
      <Text style={styles.section}>
        {query.length >= 2 ? 'Arama sonuçları' : cat === 'all' ? 'Türkiye’de en çok taranan' : CATEGORIES.find((c) => c.id === cat)?.label}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={gridItems}
      keyExtractor={(p) => p.code}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabH + 24, gap: 12, flexGrow: 1 }}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={() => {
            setRefreshing(true);
            load({ reset: true, page: 1, q: query, cat });
          }}
        />
      }
      renderItem={({ item, index }) => (
        <FadeUp delay={(index % 8) * 70} style={{ flex: 1 }}>
          <ProductCard product={item} onPress={() => open(item)} />
        </FadeUp>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (loading || more || error || items.length >= total || items.length === 0) return;
        setMore(true);
        load({ reset: false, page: page + 1, q: query, cat });
      }}
      ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ padding: 20 }} /> : undefined}
      ListEmptyComponent={
        !loading && !error && items.length > 0 ? undefined : loading ? (
          <View style={{ paddingTop: 60 }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline"
            title="Bağlanılamadı"
            message={error}
            action={<PrimaryButton title="Tekrar dene" icon="refresh" onPress={() => load({ reset: true, page: 1, q: query, cat })} style={{ marginTop: 10 }} />}
          />
        ) : (
          <EmptyState icon="search" title="Sonuç bulunamadı" message="Farklı bir kelime dene ya da barkodu doğrudan tara." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  hRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kicker: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: colors.primary, textTransform: 'uppercase', marginBottom: 6 },
  logo: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderRadius: 29, paddingHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.ink, height: '100%' },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  link: { fontSize: 16, fontWeight: '800', color: colors.primary },
  addBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 26, backgroundColor: colors.primarySoft, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary },
  addTitle: { fontSize: 19, fontWeight: '900', color: colors.primaryDark },
  addText: { fontSize: 15, color: colors.inkSoft, marginTop: 3, lineHeight: 21 },
  addBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addTile: { width: 110, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, minHeight: 200 },
  addTileText: { fontSize: 15.5, fontWeight: '800', color: colors.primaryDark },
  section: { ...font.heading, fontSize: 22, marginTop: 4 },
});
