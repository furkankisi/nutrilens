import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeUp } from '../components/FadeUp';
import { EmptyState, PrimaryButton, ProductCard } from '../components/UI';
import { customToProduct, deletePhoto } from '../lib/photos';
import { useStore } from '../lib/store';
import { colors, font, shadow } from '../theme';

export default function MyProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { custom, removeCustom } = useStore();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const confirmDelete = (id: string, name: string) =>
    Alert.alert('Ürünü sil', `“${name}” silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const c = custom.find((x) => x.id === id);
          deletePhoto(c?.frontFile);
          deletePhoto(c?.ingredientsFile);
          removeCustom(id);
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={custom}
        numColumns={2}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingHorizontal: 20, paddingBottom: insets.bottom + 110, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 6 }}>
            <Text style={font.display}>Ürünlerim</Text>
            <Text style={[font.body, { color: colors.muted, marginTop: 4 }]}>Kendi eklediğin ürünler. Uzun basarak silebilirsin.</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="add-circle" title="Henüz ürün eklemedin" message="Sistemde olmayan bir ürünün ön yüzünü ve içindekiler yazısını fotoğraflayıp analiz ettir."
            action={<PrimaryButton title="İlk ürünü ekle" icon="add" onPress={() => router.push('/add-product')} style={{ marginTop: 10 }} />} />
        }
        renderItem={({ item, index }) => (
          <FadeUp delay={(index % 8) * 70} style={{ flex: 1 }}>
            <Pressable onLongPress={() => confirmDelete(item.id, item.name)} delayLongPress={350} style={{ flex: 1 }}>
              <ProductCard product={customToProduct(item)} onPress={() => router.push({ pathname: '/product/[code]', params: { code: item.id } })} />
            </Pressable>
          </FadeUp>
        )}
      />
      <Pressable onPress={close} style={[styles.round, { top: insets.top + 8, left: 16 }]} accessibilityLabel="Geri">
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <Pressable onPress={() => router.push('/add-product')} style={[styles.fab, { bottom: insets.bottom + 20 }]} accessibilityLabel="Ürün ekle">
        <Ionicons name="add" size={26} color="#fff" />
        <Text style={styles.fabText}>Ürün ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  fab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, height: 58, paddingHorizontal: 22, borderRadius: 29, backgroundColor: colors.primaryDark, shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  fabText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
