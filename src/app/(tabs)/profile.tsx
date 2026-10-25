import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DIETS } from '../../lib/analyzer';
import { useStore } from '../../lib/store';
import { colors, font, radius, shadow, TAB_BAR_SPACE } from '../../theme';

export default function ProfileScreen() {
  const { diets, toggleDiet, history } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_SPACE + 20, gap: 16 }}>
      <Text style={font.display}>Profil</Text>

      <View style={styles.hero}>
        <Ionicons name="shield-checkmark" size={26} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Diyet tercihlerin</Text>
          <Text style={styles.heroText}>
            Seçtiklerine göre her ürün için “Sana uygun / uygun değil” sonucu veririz. {diets.length ? `${diets.length} kriter seçili.` : 'Henüz seçim yok.'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {DIETS.map((d, i) => {
          const on = diets.includes(d.id);
          return (
            <Pressable
              key={d.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleDiet(d.id);
              }}
              style={[styles.row, i > 0 && styles.border]}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
            >
              <View style={[styles.icon, on && { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={d.icon as any} size={19} color={on ? colors.primary : colors.muted} />
              </View>
              <Text style={styles.label}>{d.label}</Text>
              <View style={[styles.check, on && styles.checkOn]}>{on && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="stats-chart" size={19} color={colors.muted} />
          </View>
          <Text style={styles.label}>Taranan ürün</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>{history.length}</Text>
        </View>
      </View>

      <Text style={styles.foot}>
        Ürün verileri Open Food Facts topluluğundan gelir ve eksik ya da hatalı olabilir. NutriLens tıbbi tavsiye vermez.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, padding: 18, borderRadius: radius.lg, backgroundColor: colors.primaryDark, alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 3 },
  heroText: { color: 'rgba(255,255,255,0.8)', fontSize: 13.5, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  foot: { fontSize: 12, color: colors.muted, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12 },
});
