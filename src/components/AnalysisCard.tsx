import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fitForProfile, type Analysis, type DietId, type DietResult, type Verdict } from '../lib/analyzer';
import { colors, font, radius, shadow } from '../theme';

const V: Record<Verdict, { color: string; soft: string; icon: React.ComponentProps<typeof Ionicons>['name']; text: string }> = {
  yes: { color: colors.ok, soft: colors.okSoft, icon: 'checkmark-circle', text: 'Uygun' },
  maybe: { color: colors.warn, soft: colors.warnSoft, icon: 'alert-circle', text: 'Emin değil' },
  no: { color: colors.bad, soft: colors.badSoft, icon: 'close-circle', text: 'İçeriyor' },
  unknown: { color: colors.unknown, soft: colors.unknownSoft, icon: 'help-circle', text: 'Bilinmiyor' },
};

// "no" anlamı diyete göre değişir: Vegan için "Uygun değil", Glütensiz için "Glüten var" gibi.
const NO_TEXT: Record<string, string> = {
  vegan: 'Vegan değil',
  vegetarian: 'Vejetaryen değil',
  gluten: 'Glüten var',
  dairy: 'Süt var',
  egg: 'Yumurta var',
  nuts: 'Kuruyemiş var',
  soy: 'Soya var',
};
const YES_TEXT: Record<string, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vejetaryen',
  gluten: 'Glütensiz',
  dairy: 'Süt yok',
  egg: 'Yumurta yok',
  nuts: 'Kuruyemiş yok',
  soy: 'Soya yok',
};

const FIT = {
  ok: { c: colors.ok, bg: colors.okSoft, icon: 'shield-checkmark' as const },
  warn: { c: colors.warn, bg: colors.warnSoft, icon: 'warning' as const },
  bad: { c: colors.bad, bg: colors.badSoft, icon: 'close-circle' as const },
  none: { c: colors.primary, bg: colors.primarySoft, icon: 'sparkles' as const },
};

const STEP_MS = 620;

type Props = {
  analysis: Analysis;
  selected: DietId[];
  /** Sıralı "kontrol ediliyor…" animasyonu */
  animate?: boolean;
  startDelay?: number;
  onDone?: () => void;
};

export function AnalysisCard({ analysis, selected, animate = true, startDelay = 0, onDone }: Props) {
  const rows = useMemo(
    () => [...analysis.results].sort((a, b) => Number(selected.includes(b.diet.id)) - Number(selected.includes(a.diet.id))),
    [analysis, selected],
  );
  const total = rows.length;
  // step: -1 = başlamadı, 0..total-1 = o satır kontrol ediliyor, total = bitti
  const [step, setStep] = useState(animate ? -1 : total);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!animate) return;
    setStep(-1);
    doneRef.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i <= total; i++) timers.push(setTimeout(() => setStep(i), startDelay + 300 + i * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [animate, total, startDelay, analysis]);

  // Bir satır tamamlandığında titreşim
  useEffect(() => {
    if (!animate || step < 1 || step > total) return;
    const r = rows[step - 1];
    if (r.verdict === 'no') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else Haptics.selectionAsync().catch(() => {});
    if (step === total && !doneRef.current) {
      doneRef.current = true;
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onDoneRef.current?.();
      }, 150);
    }
  }, [step, animate, total, rows]);

  const finished = step >= total;
  return (
    <View style={{ gap: 14 }}>
      <Banner analysis={analysis} selected={selected} finished={finished} progress={Math.max(0, Math.min(step, total)) / total} />
      <View style={styles.card}>
        {rows.map((r, i) => (
          <Row key={r.diet.id} r={r} index={i} state={i < step ? 'done' : i === step ? 'checking' : 'idle'} mine={selected.includes(r.diet.id)} />
        ))}
      </View>
      <Text style={styles.disclaimer}>
        Analiz içindekiler listesine dayanır ve bilgilendirme amaçlıdır. Alerjin veya ciddi bir hassasiyetin varsa ambalajı ayrıca kontrol et.
      </Text>
    </View>
  );
}

function Banner({ analysis, selected, finished, progress }: { analysis: Analysis; selected: DietId[]; finished: boolean; progress: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bar, { toValue: progress, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, bar]);
  useEffect(() => {
    if (finished) Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
  }, [finished, pop]);

  if (!finished) {
    return (
      <View style={[styles.banner, { backgroundColor: colors.primarySoft }]}>
        <ActivityIndicator color={colors.primary} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[styles.bannerTitle, { color: colors.primaryDark }]}>İçerik analiz ediliyor…</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['4%', '100%'] }) }]} />
          </View>
        </View>
      </View>
    );
  }
  const fit = fitForProfile(analysis, selected);
  const f = FIT[fit.status];
  return (
    <Animated.View style={[styles.banner, { backgroundColor: f.bg, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
      <Ionicons name={f.icon} size={40} color={f.c} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: f.c, fontSize: 24 }]}>{fit.title}</Text>
        <Text style={styles.bannerText}>{fit.detail}</Text>
      </View>
    </Animated.View>
  );
}

function Row({ r, index, state, mine }: { r: DietResult; index: number; state: 'idle' | 'checking' | 'done'; mine: boolean }) {
  const appear = useRef(new Animated.Value(state === 'idle' ? 0 : 1)).current;
  const pop = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;
  const prev = useRef(state);

  useEffect(() => {
    if (state !== 'idle' && prev.current === 'idle') {
      Animated.timing(appear, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    if (state === 'done' && prev.current !== 'done') {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 18 }).start();
    }
    prev.current = state;
  }, [state, appear, pop]);

  const v = V[r.verdict];
  const label = r.verdict === 'no' ? NO_TEXT[r.diet.id] : r.verdict === 'yes' ? YES_TEXT[r.diet.id] : v.text;
  const done = state === 'done';
  return (
    <Animated.View
      style={[
        styles.row,
        index > 0 && styles.rowBorder,
        { opacity: appear.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }), transform: [{ translateX: appear.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] },
      ]}
    >
      <Animated.View
        style={[styles.rowIcon, { backgroundColor: done ? v.soft : colors.unknownSoft }, done && { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
      >
        {done ? <Ionicons name={v.icon} size={26} color={v.color} /> : state === 'checking' ? <ActivityIndicator size="small" color={colors.muted} /> : <Ionicons name="ellipse-outline" size={22} color={colors.border} />}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.rowTitle}>{r.diet.short}</Text>
          {mine && <Ionicons name="star" size={14} color={colors.gold} />}
        </View>
        {done && r.reasons.length > 0 && r.verdict !== 'unknown' && <Text style={styles.reason}>{r.reasons.slice(0, 3).join(' · ')}</Text>}
        {state === 'checking' && <Text style={styles.reason}>Kontrol ediliyor…</Text>}
      </View>
      {done && (
        <Animated.View style={[styles.tag, { backgroundColor: v.soft, opacity: pop }]}>
          <Text style={[styles.tagText, { color: v.color }]}>{label}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: radius.lg, minHeight: 92 },
  bannerTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  bannerText: { ...font.body, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,181,120,0.2)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  reason: { fontSize: 14, color: colors.muted, marginTop: 2, lineHeight: 19 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  tagText: { fontSize: 14, fontWeight: '800' },
  disclaimer: { fontSize: 13, color: colors.muted, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});
