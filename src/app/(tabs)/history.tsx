import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PrimaryButton } from '../../components/UI';
import { useStore, type HistoryItem } from '../../lib/store';
import { colors, font, radius, shadow, TAB_BAR_SPACE } from '../../theme';

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Dün' : `${d} gün önce`;
}

export default function HistoryScreen() {
  const { history, removeHistory, clearHistory } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const open = (h: HistoryItem) => {
    if (h.source === 'label') router.push({ pathname: '/label', params: { text: h.ingredientsText ?? '', title: h.name } });
    else router.push({ pathname: '/product/[code]', params: { code: h.id } });
  };

  const confirmClear = () =>
    Alert.alert('Geçmişi temizle', 'Tüm taranan ürünler silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: clearHistory },
    ]);

  return (
    <FlatList
      data={history}
      keyExtractor={(h) => h.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE + 20, gap: 10, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={font.display}>Geçmiş</Text>
          {history.length > 0 && (
            <Pressable onPress={confirmClear} hitSlop={10}>
              <Text style={{ color: colors.bad, fontWeight: '700', fontSize: 15, marginBottom: 6 }}>Temizle</Text>
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="time-outline"
          title="Henüz tarama yok"
          message="Taradığın ürünler ve etiket analizlerin burada saklanır."
          action={<PrimaryButton title="İlk ürünü tara" icon="barcode-outline" onPress={() => router.push('/scan')} style={{ marginTop: 10 }} />}
        />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.9 : 1 }]}>
          <View style={styles.thumb}>
            {item.thumb ? (
              <Image source={{ uri: item.thumb }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : (
              <Ionicons name={item.source === 'label' ? 'document-text' : 'image-outline'} size={24} color={colors.muted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={font.caption} numberOfLines={1}>
              {[item.brand, item.source === 'label' ? 'Etiket analizi' : item.id, ago(item.scannedAt)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Ionicons name="trash-outline" size={19} color={colors.muted} onPress={() => removeHistory(item.id)} suppressHighlighting />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.ink, marginBottom: 2 },
});
