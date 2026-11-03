import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVITY, BMI_STEPS, calcBmi, calcMacros, GOALS, num, validBody } from '../lib/calc';
import { useStore } from '../lib/store';
import { colors, font, radius } from '../theme';
import { FadeUp } from './FadeUp';

const SIZE = 60;
const MARGIN = 12;
const C = { protein: '#2D9CFF', carbs: '#FFB020', fat: '#FF5C8A' };

/** Uygulamanın her yerinde gezen, sürüklenebilir hesaplayıcı baloncuğu. */
export function FloatingCalc() {
  const segments = useSegments() as string[];
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const openRef = useRef(() => setOpen(true));

  const start = { x: W - SIZE - MARGIN, y: H - insets.bottom - 230 };
  const pos = useRef(new Animated.ValueXY(start)).current;
  const cur = useRef(start);
  const press = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const minY = insets.top + 56;
  const maxY = H - insets.bottom - SIZE - 20;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pos.setOffset({ x: cur.current.x, y: cur.current.y });
          pos.setValue({ x: 0, y: 0 });
          Animated.spring(press, { toValue: 1.12, useNativeDriver: true, speed: 30 }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          pos.flattenOffset();
          Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
          const moved = Math.hypot(g.dx, g.dy);
          const nx = cur.current.x + g.dx;
          const ny = cur.current.y + g.dy;
          const tx = moved < 8 ? cur.current.x : nx + SIZE / 2 < W / 2 ? MARGIN : W - SIZE - MARGIN;
          const ty = moved < 8 ? cur.current.y : Math.min(Math.max(ny, minY), maxY);
          cur.current = { x: tx, y: ty };
          Animated.spring(pos, { toValue: { x: tx, y: ty }, useNativeDriver: false, speed: 14, bounciness: 8 }).start();
          if (moved < 8) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            openRef.current();
          }
        },
        onPanResponderTerminate: () => {
          pos.flattenOffset();
          Animated.spring(press, { toValue: 1, useNativeDriver: true }).start();
        },
      }),
    [W, minY, maxY, pos, press],
  );

  // Kamera ekranında gizle
  if (segments.includes('label')) return null;

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.bubbleWrap, { transform: pos.getTranslateTransform() }]} {...pan.panHandlers}>
          <Animated.View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', transform: [{ scale: press }] }}>
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]}
            />
            <LinearGradient colors={['#8B5CF6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubble}>
              <Ionicons name="calculator" size={28} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </View>
      <CalcSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ------------------------------------------------------------------ panel

function CalcSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { body, setBody } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'macro' | 'bmi'>('macro');
  const macros = useMemo(() => calcMacros(body), [body]);
  const bmi = useMemo(() => calcBmi(body), [body]);
  const v = validBody(body);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Hesaplayıcı</Text>
              <Pressable onPress={onClose} style={styles.x} accessibilityLabel="Kapat"><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
            </View>

            <View style={styles.seg}>
              {([['macro', 'Makro', 'nutrition'], ['bmi', 'VKİ', 'body']] as const).map(([id, label, icon]) => (
                <Pressable key={id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(id); }} style={[styles.segItem, tab === id && styles.segOn]}>
                  <Ionicons name={icon} size={18} color={tab === id ? '#fff' : colors.muted} />
                  <Text style={[styles.segText, tab === id && { color: '#fff' }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <NumInput label="Kilo" unit="kg" value={body.weight} onChange={(t) => setBody({ weight: t })} bad={body.weight !== '' && !v.weight} />
                <NumInput label="Boy" unit="cm" value={body.height} onChange={(t) => setBody({ height: t })} bad={body.height !== '' && !v.height} />
              </View>

              {tab === 'macro' ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <NumInput label="Yaş" unit="yıl" value={body.age} onChange={(t) => setBody({ age: t.replace(/[^0-9]/g, '') })} bad={body.age !== '' && !v.age} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={styles.label}>Cinsiyet</Text>
                      <View style={styles.mini}>
                        {([['m', 'Erkek'], ['f', 'Kadın']] as const).map(([id, l]) => (
                          <Pressable key={id} onPress={() => setBody({ sex: id })} style={[styles.miniItem, body.sex === id && styles.miniOn]}>
                            <Text style={[styles.miniText, body.sex === id && { color: '#fff' }]}>{l}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={styles.label}>Hareket düzeyi</Text>
                    {ACTIVITY.map((a, i) => (
                      <Pressable key={a.label} onPress={() => { Haptics.selectionAsync().catch(() => {}); setBody({ activity: i }); }} style={[styles.opt, body.activity === i && styles.optOn]}>
                        <View style={[styles.radio, body.activity === i && styles.radioOn]}>{body.activity === i && <View style={styles.radioDot} />}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optTitle}>{a.label}</Text>
                          <Text style={font.caption}>{a.hint}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={styles.label}>Hedefin</Text>
                    <View style={styles.mini}>
                      {GOALS.map((g) => (
                        <Pressable key={g.id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setBody({ goal: g.id }); }} style={[styles.miniItem, body.goal === g.id && styles.miniOn]}>
                          <Text style={[styles.miniText, body.goal === g.id && { color: '#fff' }]}>{g.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {macros ? <MacroResult m={macros} weight={num(body.weight)} /> : <Hint text="Kilo, boy ve yaşını gir; günlük protein, karbonhidrat ve yağ ihtiyacını hesaplayalım." />}
                </>
              ) : bmi ? (
                <BmiResult b={bmi} />
              ) : (
                <Hint text="Kilo ve boyunu girince vücut kitle indeksini ve ideal kilo aralığını gösterelim." />
              )}

              <Text style={styles.disc}>Sonuçlar genel tahminlerdir ve tıbbi tavsiye değildir. Hastalığın, hamileliğin veya özel bir durumun varsa diyetisyene danış.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function NumInput({ label, unit, value, onChange, bad }: { label: string; unit: string; value: string; onChange: (t: string) => void; bad?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, bad && { borderColor: colors.bad }]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, '').slice(0, 5))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={5}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <View style={styles.hint}>
      <Ionicons name="information-circle" size={24} color={colors.primary} />
      <Text style={[font.body, { flex: 1, color: colors.primaryDark }]}>{text}</Text>
    </View>
  );
}

function MacroResult({ m, weight }: { m: NonNullable<ReturnType<typeof calcMacros>>; weight: number }) {
  const bar = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    const t = [m.proteinPct, m.carbsPct, m.fatPct];
    Animated.parallel(bar.map((b, i) => Animated.timing(b, { toValue: t[i], duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }))).start();
  }, [m, bar]);
  const items = [
    { k: 'Protein', g: m.protein, pct: m.proteinPct, per: m.perKg.protein, c: C.protein, icon: 'barbell' as const },
    { k: 'Karbonhidrat', g: m.carbs, pct: m.carbsPct, per: m.perKg.carbs, c: C.carbs, icon: 'flash' as const },
    { k: 'Yağ', g: m.fat, pct: m.fatPct, per: m.perKg.fat, c: C.fat, icon: 'water' as const },
  ];
  return (
    <FadeUp style={{ gap: 14 }} distance={14}>
      <LinearGradient colors={['#00C98B', '#00875A']} style={styles.kcal}>
        <Text style={styles.kcalSmall}>Günlük hedef</Text>
        <Text style={styles.kcalBig}>{m.kcal} <Text style={{ fontSize: 22 }}>kcal</Text></Text>
        <Text style={styles.kcalSmall}>Bazal metabolizma {m.bmr} · Günlük harcama {m.tdee} kcal</Text>
      </LinearGradient>

      <View style={styles.stack}>
        {bar.map((b, i) => (
          <Animated.View key={i} style={{ height: 14, backgroundColor: items[i].c, width: b.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {items.map((it) => (
          <View key={it.k} style={[styles.macro, { backgroundColor: it.c + '1F' }]}>
            <View style={[styles.macroIcon, { backgroundColor: it.c }]}><Ionicons name={it.icon} size={16} color="#fff" /></View>
            <Text style={styles.macroG}>{it.g}<Text style={{ fontSize: 15 }}> g</Text></Text>
            <Text style={[styles.macroK, { color: it.c }]} numberOfLines={1} adjustsFontSizeToFit>{it.k}</Text>
            <Text style={font.caption}>%{it.pct} · {it.per} g/kg</Text>
          </View>
        ))}
      </View>
      <Text style={[font.caption, { textAlign: 'center' }]}>
        3 öğünde öğün başına yaklaşık {Math.round(m.protein / 3)} g protein, {Math.round(m.carbs / 3)} g karbonhidrat, {Math.round(m.fat / 3)} g yağ ({Math.round(weight)} kg için).
      </Text>
    </FadeUp>
  );
}

function BmiResult({ b }: { b: NonNullable<ReturnType<typeof calcBmi>> }) {
  const marker = useRef(new Animated.Value(0)).current;
  const MIN = 12;
  const MAX = 40;
  const pct = Math.min(Math.max((b.value - MIN) / (MAX - MIN), 0), 1);
  useEffect(() => {
    Animated.spring(marker, { toValue: pct, useNativeDriver: false, speed: 9, bounciness: 10 }).start();
  }, [pct, marker]);
  // Renkli bant: her adımın genişliği aralığıyla orantılı
  const segs = BMI_STEPS.map((s, i) => {
    const from = i === 0 ? MIN : BMI_STEPS[i - 1].max;
    const to = Math.min(s.max, MAX);
    return { color: s.color, flex: Math.max(to - from, 0.1) };
  });
  return (
    <FadeUp style={{ gap: 14 }} distance={14}>
      <View style={[styles.bmiCard, { backgroundColor: b.color + '1F' }]}>
        <Text style={styles.bmiSmall}>Vücut kitle indeksin</Text>
        <Text style={[styles.bmiBig, { color: b.color }]}>{b.value}</Text>
        <View style={[styles.bmiTag, { backgroundColor: b.color }]}><Text style={styles.bmiTagText}>{b.label}</Text></View>
      </View>

      <View style={{ paddingTop: 22 }}>
        <View style={styles.gauge}>
          {segs.map((s, i) => <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />)}
        </View>
        <Animated.View style={[styles.marker, { left: marker.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
          <Ionicons name="caret-down" size={26} color={colors.ink} style={{ marginLeft: -13 }} />
        </Animated.View>
      </View>

      <View style={styles.ideal}>
        <Ionicons name="flag" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.idealTitle}>İdeal kilo aralığın: {b.idealMin} – {b.idealMax} kg</Text>
          <Text style={font.caption}>
            {b.diffKg === 0 ? 'Şu an bu aralıktasın.' : b.diffKg > 0 ? `Aralığa girmek için yaklaşık ${b.diffKg} kg almalısın.` : `Aralığa girmek için yaklaşık ${Math.abs(b.diffKg)} kg vermelisin.`}
          </Text>
        </View>
      </View>
      <Text style={font.body}>{b.note}</Text>
      <Text style={font.caption}>VKİ kas kütlesini hesaba katmaz; sporcularda gerçek durumu yansıtmayabilir.</Text>
    </FadeUp>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#6D3FE0' },
  bubble: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#2563EB', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,26,18,0.5)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 20, paddingTop: 10, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6, color: colors.ink },
  x: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 22, padding: 4, marginBottom: 14 },
  segItem: { flex: 1, height: 46, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.primaryDark },
  segText: { fontSize: 17, fontWeight: '800', color: colors.muted },
  label: { fontSize: 16, fontWeight: '800', color: colors.ink },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink, height: '100%' },
  unit: { fontSize: 16, fontWeight: '700', color: colors.muted },
  mini: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 4, borderWidth: 1.5, borderColor: colors.border },
  miniItem: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniOn: { backgroundColor: colors.primary },
  miniText: { fontSize: 15.5, fontWeight: '800', color: colors.inkSoft },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  kcal: { borderRadius: 26, padding: 20, alignItems: 'center', gap: 4 },
  kcalSmall: { color: 'rgba(255,255,255,0.92)', fontSize: 14.5, fontWeight: '700', textAlign: 'center' },
  kcalBig: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1.5 },
  stack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  macro: { flex: 1, borderRadius: 22, padding: 12, alignItems: 'center', gap: 4 },
  macroIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  macroG: { fontSize: 28, fontWeight: '900', color: colors.ink },
  macroK: { fontSize: 14.5, fontWeight: '800' },
  bmiCard: { borderRadius: 26, padding: 22, alignItems: 'center', gap: 6 },
  bmiSmall: { fontSize: 16, fontWeight: '700', color: colors.inkSoft },
  bmiBig: { fontSize: 68, fontWeight: '900', letterSpacing: -2 },
  bmiTag: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  bmiTagText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  gauge: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden' },
  marker: { position: 'absolute', top: -4 },
  ideal: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  idealTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  disc: { fontSize: 12.5, color: colors.muted, lineHeight: 18, textAlign: 'center' },
});
