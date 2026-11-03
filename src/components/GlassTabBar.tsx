import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSetTabBarHeight } from '../lib/tabbar';
import { colors } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const META: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'compass', off: 'compass-outline', label: 'Keşfet' },
  scan: { on: 'barcode', off: 'barcode-outline', label: 'Tara' },
  history: { on: 'time', off: 'time-outline', label: 'Geçmiş' },
  profile: { on: 'person-circle', off: 'person-circle-outline', label: 'Profil' },
};
const BAR_H = 74;

function Glass({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios' && isGlassEffectAPIAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.45)" style={styles.pill}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={90} tint="light" style={styles.pill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.55)' }]} />
        {children}
      </BlurView>
    );
  }
  return <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.97)' }]}>{children}</View>;
}

export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const setHeight = useSetTabBarHeight();
  const [rowW, setRowW] = useState(0);
  const n = state.routes.length;
  const slot = rowW / n;
  const x = useRef(new Animated.Value(0)).current;
  const bottomPad = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (!slot) return;
    Animated.spring(x, { toValue: state.index * slot, useNativeDriver: true, speed: 16, bounciness: 9 }).start();
  }, [state.index, slot, x]);

  const onRowLayout = (e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width);
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height + 8)}
    >
      <View style={styles.shadow}>
        <Glass>
          {/* üst kenar ışığı (cam parlaması) */}
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
            style={styles.shine}
            pointerEvents="none"
          />
          <View style={styles.row} onLayout={onRowLayout}>
            {slot > 0 && activeRoute !== 'scan' && (
              <Animated.View style={[styles.indicator, { width: slot - 10, transform: [{ translateX: Animated.add(x, 5) }] }]} />
            )}
            {state.routes.map((route, index) => {
              const meta = META[route.name];
              if (!meta) return null;
              const focused = state.index === index;
              const isScan = route.name === 'scan';
              const onPress = () => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  navigateToTab(route.key);
                }
              };
              return (
                <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel={meta.label} accessibilityState={{ selected: focused }}>
                  {isScan ? (
                    <View style={styles.scanWrap}>
                      <LinearGradient colors={focused ? ['#00E0A0', '#009B6B'] : ['#00C98B', '#00875A']} style={styles.scanBtn}>
                        <Ionicons name={meta.on} size={28} color="#fff" />
                      </LinearGradient>
                      <Text style={[styles.label, { color: colors.primary }]}>{meta.label}</Text>
                    </View>
                  ) : (
                    <View style={styles.itemInner}>
                      <Ionicons name={focused ? meta.on : meta.off} size={26} color={focused ? colors.primaryDark : colors.muted} />
                      <Text style={[styles.label, { color: focused ? colors.primaryDark : colors.muted }]}>{meta.label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  shadow: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 38,
    shadowColor: '#053B28',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  pill: { borderRadius: 38, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  shine: { position: 'absolute', top: 0, left: 0, right: 0, height: 30 },
  row: { flexDirection: 'row', height: BAR_H, alignItems: 'center' },
  indicator: { position: 'absolute', top: 8, height: BAR_H - 16, borderRadius: 28, backgroundColor: 'rgba(0,181,120,0.18)', borderWidth: 1, borderColor: 'rgba(0,181,120,0.25)' },
  item: { flex: 1, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
  itemInner: { alignItems: 'center', gap: 2 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.1 },
  scanWrap: { alignItems: 'center', gap: 1, marginTop: -2 },
  scanBtn: {
    width: 54,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B578',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
