import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fitForProfile, type Analysis, type DietId, type Verdict } from '../lib/analyzer';
import { colors, font, radius, shadow } from '../theme';

const V: Record<Verdict, { color: string; soft: string; icon: React.ComponentProps<typeof Ionicons>['name']; text: string }> = {
  yes: { color: colors.ok, soft: colors.okSoft, icon: 'checkmark-circle', text: 'Uygun' },
  maybe: { color: colors.warn, soft: colors.warnSoft, icon: 'alert-circle', text: 'Emin değil' },
  no: { color: colors.bad, soft: colors.badSoft, icon: 'close-circle', text: 'Uygun değil' },
  unknown: { color: colors.unknown, soft: colors.unknownSoft, icon: 'help-circle', text: 'Bilinmiyor' },
};

const FIT = {
  ok: { c: colors.ok, bg: colors.okSoft, icon: 'shield-checkmark' as const },
  warn: { c: colors.warn, bg: colors.warnSoft, icon: 'warning' as const },
  bad: { c: colors.bad, bg: colors.badSoft, icon: 'close-circle' as const },
  none: { c: colors.primary, bg: colors.primarySoft, icon: 'sparkles' as const },
};

export function AnalysisCard({ analysis, selected }: { analysis: Analysis; selected: DietId[] }) {
  const fit = fitForProfile(analysis, selected);
  const f = FIT[fit.status];
  // Seçili diyetler öne çıksın
  const rows = [...analysis.results].sort((a, b) => Number(selected.includes(b.diet.id)) - Number(selected.includes(a.diet.id)));
  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.banner, { backgroundColor: f.bg }]}>
        <Ionicons name={f.icon} size={30} color={f.c} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: f.c }]}>{fit.title}</Text>
          <Text style={styles.bannerText}>{fit.detail}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {rows.map((r, i) => {
          const v = V[r.verdict];
          const mine = selected.includes(r.diet.id);
          return (
            <View key={r.diet.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={[styles.rowIcon, { backgroundColor: v.soft }]}>
                <Ionicons name={v.icon} size={20} color={v.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.rowTitle}>{r.diet.label}</Text>
                  {mine && <Ionicons name="star" size={12} color={colors.gold} />}
                </View>
                {r.reasons.length > 0 && <Text style={styles.reason}>{r.reasons.slice(0, 4).join(' · ')}</Text>}
              </View>
              <Text style={[styles.verdict, { color: v.color }]}>{v.text}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.disclaimer}>
        Analiz içindekiler listesine dayanır ve bilgilendirme amaçlıdır. Alerjin veya ciddi bir hassasiyetin varsa ambalajı ayrıca kontrol et.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.lg },
  bannerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  bannerText: { ...font.body, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  reason: { fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 17 },
  verdict: { fontSize: 13, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: colors.muted, lineHeight: 17, textAlign: 'center', paddingHorizontal: 8 },
});
