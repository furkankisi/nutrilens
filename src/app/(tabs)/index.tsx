import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, EmptyState, PrimaryButton, ProductCard } from '../../components/UI';
import { ApiError, browseCategory, CATEGORIES, searchProducts, type Product } from '../../lib/off';
import { colors, font, TAB_BAR_SPACE } from '../../theme';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const open = (p: Product) => router.push({ pathname: '/product/[code]', params: { code: p.code } });

  const header = (
    <View style={{ paddingTop: insets.top + 12, gap: 14, paddingBottom: 6 }}>
      <View style={styles.hRow}>
        <View>
          <Text style={styles.kicker}>NutriLens</Text>
          <Text style={font.display}>Keşfet</Text>
        </View>
        <View style={styles.logo}>
          <Ionicons name="nutrition" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={19} color={colors.muted} />
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
        {query.length > 0 && <Ionicons name="close-circle" size={19} color={colors.muted} onPress={() => setQuery('')} />}
      </View>

      {query.length < 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} active={cat === c.id} icon={c.icon as any} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
      )}
      <Text style={styles.section}>{query.length >= 2 ? 'Arama sonuçları' : cat === 'all' ? 'Türkiye’de en çok taranan' : CATEGORIES.find((c) => c.id === cat)?.label}</Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.code}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE + 20, gap: 12, flexGrow: 1 }}
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
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard product={item} onPress={() => open(item)} />
        </View>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (loading || more || error || items.length >= total || items.length === 0) return;
        setMore(true);
        load({ reset: false, page: page + 1, q: query, cat });
      }}
      ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ padding: 20 }} /> : undefined}
      ListEmptyComponent={
        loading ? (
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
  hRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kicker: { fontSize: 13, fontWeight: '800', letterSpacing: 1.6, color: colors.primary, textTransform: 'uppercase', marginBottom: 2 },
  logo: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 25, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, height: '100%' },
  section: { ...font.heading, marginTop: 4 },
});
