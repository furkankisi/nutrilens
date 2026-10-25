import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

export type Box = { x: number; y: number; w: number; h: number };

type Props = {
  /** Barkodun ekrandaki konumu. Varsa çerçeve oraya kilitlenir. */
  locked: Box | null;
  /** Barkod algılandı ama konum bilgisi yok (Android bazı cihazlar) → merkezde kilitle. */
  detected: boolean;
  hint: string;
};

const LASER = '#3DF5A0';
const DIM = 'rgba(8,16,12,0.62)';
const CORNER = 26;

export function ScannerOverlay({ locked, detected, hint }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Çerçeve geometrisi (spring ile animasyonlu)
  const left = useRef(new Animated.Value(0)).current;
  const top = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const laser = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const initialized = useRef(false);

  const idleBox = useMemo<Box>(() => {
    const w = Math.min(size.w * 0.82, 340);
    const h = Math.min(w * 0.52, 180);
    return { x: (size.w - w) / 2, y: size.h * 0.34 - h / 2, w, h };
  }, [size]);

  const target: Box = locked ?? idleBox;

  // Geometri güncelle
  useEffect(() => {
    if (!size.w) return;
    const cfg = { useNativeDriver: false, speed: 14, bounciness: locked ? 7 : 3 } as const;
    if (!initialized.current) {
      left.setValue(target.x);
      top.setValue(target.y);
      width.setValue(target.w);
      height.setValue(target.h);
      initialized.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(left, { toValue: target.x, ...cfg }),
      Animated.spring(top, { toValue: target.y, ...cfg }),
      Animated.spring(width, { toValue: target.w, ...cfg }),
      Animated.spring(height, { toValue: target.h, ...cfg }),
    ]).start();
  }, [target.x, target.y, target.w, target.h, size.w, locked, left, top, width, height]);

  // Lazer: boşta yavaş süpürme, kilitliyken hızlı yukarı-aşağı titreşim
  const isLocked = !!locked || detected;
  useEffect(() => {
    laser.setValue(0);
    const dur = isLocked ? 340 : 1700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(laser, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLocked, laser]);

  // Kilitlenme anında parlama
  useEffect(() => {
    if (isLocked) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 140, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 380, useNativeDriver: false }),
      ]).start();
    }
  }, [isLocked, pulse]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const laserTop = Animated.multiply(laser, Animated.subtract(height, 3));
  const bottomTop = Animated.add(top, height);
  const rightLeft = Animated.add(left, width);
  const cornerColor = isLocked ? LASER : '#FFFFFF';
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.w > 0 && (
        <>
          {/* Karartma maskesi: çerçevenin dışı */}
          <Animated.View style={[styles.dim, { left: 0, right: 0, top: 0, height: top }]} />
          <Animated.View style={[styles.dim, { left: 0, right: 0, top: bottomTop, bottom: 0 }]} />
          <Animated.View style={[styles.dim, { left: 0, top, width: left, height }]} />
          <Animated.View style={[styles.dim, { left: rightLeft, right: 0, top, height }]} />

          {/* Çerçeve */}
          <Animated.View style={{ position: 'absolute', left, top, width, height }}>
            <Animated.View style={[styles.flash, { opacity: glow }]} />
            <View style={[styles.corner, styles.tl, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.tr, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.bl, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.br, { borderColor: cornerColor }]} />

            {/* Lazer */}
            <Animated.View style={[styles.laserWrap, { transform: [{ translateY: laserTop }] }]}>
              <LinearGradient
                colors={['rgba(61,245,160,0)', 'rgba(61,245,160,0.28)']}
                style={styles.trail}
              />
              <View style={styles.laserLine} />
            </Animated.View>
          </Animated.View>

          <View style={[styles.hintWrap, { top: size.h * 0.34 + idleBox.h / 2 + 24 }]}>
            <View style={[styles.hintPill, isLocked && { backgroundColor: 'rgba(15,138,95,0.9)' }]}>
              <Text style={styles.hintText}>{isLocked ? 'Barkod yakalandı' : hint}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: 'rgba(61,245,160,0.22)' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderWidth: 4 },
  tl: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 14 },
  tr: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 14 },
  bl: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 14 },
  br: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 14 },
  laserWrap: { position: 'absolute', left: 6, right: 6, top: 0, height: 3 },
  laserLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: LASER,
    shadowColor: LASER,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  trail: { position: 'absolute', left: 0, right: 0, top: -34, height: 34 },
  hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(8,16,12,0.55)' },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
