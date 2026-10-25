import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'compass', off: 'compass-outline', label: 'Keşfet' },
  scan: { on: 'scan', off: 'scan-outline', label: 'Tara' },
  history: { on: 'time', off: 'time-outline', label: 'Geçmiş' },
  profile: { on: 'person', off: 'person-outline', label: 'Profil' },
};

function Backdrop({ children }: { children: React.ReactNode }) {
  const liquid = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  if (liquid) {
    return (
      <GlassView glassEffectStyle="regular" tintColor="#FFFFFF66" style={styles.pill}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={70} tint="systemChromeMaterialLight" style={[styles.pill, styles.pillBorder]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[styles.pill, styles.pillBorder, { backgroundColor: 'rgba(255,255,255,0.96)' }]}>{children}</View>;
}

export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadow}>
        <Backdrop>
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const meta = ICONS[route.name];
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
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel={meta.label}
                  accessibilityState={{ selected: focused }}
                  style={styles.item}
                >
                  {isScan ? (
                    <View style={[styles.scanBtn, focused && styles.scanBtnOn]}>
                      <Ionicons name="barcode-outline" size={26} color="#fff" />
                    </View>
                  ) : (
                    <View style={[styles.itemInner, focused && styles.itemInnerOn]}>
                      <Ionicons name={focused ? meta.on : meta.off} size={22} color={focused ? colors.primaryDark : colors.muted} />
                      {focused && <Text style={styles.label}>{meta.label}</Text>}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Backdrop>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20 },
  shadow: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 34,
    shadowColor: '#0E1A14',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  pill: { borderRadius: 34, overflow: 'hidden' },
  pillBorder: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(14,26,20,0.12)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 46, borderRadius: 23 },
  itemInnerOn: { backgroundColor: colors.primarySoft },
  label: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  scanBtn: {
    width: 56,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnOn: { backgroundColor: colors.primary },
});
