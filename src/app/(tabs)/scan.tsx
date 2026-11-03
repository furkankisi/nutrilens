import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScannerOverlay, type Box } from '../../components/ScannerOverlay';
import { PrimaryButton } from '../../components/UI';
import { isValidProductBarcode } from '../../lib/ean';
import { useTabBarHeight } from '../../lib/tabbar';
import { colors, font } from '../../theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabH = useTabBarHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [torch, setTorch] = useState(false);
  const [locked, setLocked] = useState<Box | null>(null);
  const [detected, setDetected] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const [kb, setKb] = useState(0);
  const blur = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  // Navbar'ın altına girmemek için: ölçülen yükseklik ile güvenli alt sınırın büyüğü
  const bottomOffset = Math.max(tabH, insets.bottom + 12 + 74 + 16) + 12;

  // "Elle gir" açılınca kamera görüntüsü animasyonla bulanıklaşır
  useEffect(() => {
    Animated.timing(blur, { toValue: manual ? 1 : 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [manual, blur]);

  const closeManual = useCallback(() => {
    Keyboard.dismiss();
    setManual(false);
    setCode('');
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Sekme odaktayken kamerayı aç, ayrılınca kapat (pil + gizlilik)
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      setLocked(null);
      setDetected(false);
      setActive(true);
      return () => {
        setActive(false);
        setTorch(false);
      };
    }, []),
  );

  const go = useCallback(
    (barcode: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Lazerin kilitlenme animasyonu görünsün diye kısa bekleme
      setTimeout(() => router.push({ pathname: '/product/[code]', params: { code: barcode } }), 650);
    },
    [router],
  );

  const onScanned = useCallback(
    (r: BarcodeScanningResult) => {
      if (busy.current) return;
      const value = (r.data ?? '').trim();
      if (!isValidProductBarcode(value)) return; // yanlış okuma: sessizce yoksay
      busy.current = true;

      // Konum bilgisi görünüm koordinatında ve makul ise çerçeveyi barkoda kilitle.
      const b = r.bounds;
      let box: Box | null = null;
      if (b && b.size.width > 24 && b.size.height > 8 && viewSize.w > 0) {
        const padX = 14;
        const padY = 14;
        const x = b.origin.x - padX;
        const y = b.origin.y - padY;
        const w = b.size.width + padX * 2;
        const h = Math.max(b.size.height + padY * 2, 70);
        const inside = x > -viewSize.w * 0.2 && y > -viewSize.h * 0.2 && x + w < viewSize.w * 1.2 && y + h < viewSize.h * 1.2;
        if (inside) box = { x: Math.max(8, x), y: Math.max(8, y), w: Math.min(w, viewSize.w - 16), h };
      }
      setLocked(box);
      setDetected(true);
      go(value);
    },
    [go, viewSize],
  );

  const submitManual = () => {
    const c = code.trim();
    if (!isValidProductBarcode(c)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    Keyboard.dismiss();
    router.push({ pathname: '/product/[code]', params: { code: c } });
  };

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <View style={[styles.perm, { paddingTop: insets.top + 40 }]}>
        <View style={styles.permIcon}>
          <Ionicons name="camera" size={34} color={colors.primary} />
        </View>
        <Text style={[font.title, { textAlign: 'center' }]}>Kamera izni gerekli</Text>
        <Text style={[font.body, { textAlign: 'center', color: colors.muted }]}>
          Barkodları ve ürün etiketlerini taramak için kameraya erişmemiz gerekiyor. Görüntüler cihazından ayrılmaz; yalnızca barkod numarası veya etiket fotoğrafı analiz için kullanılır.
        </Text>
        <PrimaryButton
          title={permission.canAskAgain ? 'İzin ver' : 'Ayarlardan izin ver'}
          icon="camera-outline"
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={{ alignSelf: 'stretch', marginTop: 8 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.dark} onLayout={(e) => setViewSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          autofocus="on"
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={detected || manual ? undefined : onScanned}
        />
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: blur.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <ScannerOverlay locked={locked} detected={detected} hint="Barkodu çerçevenin içine getir" />
      </Animated.View>

      {/* Bulanık arka plan: dokununca kapanır */}
      <Pressable style={StyleSheet.absoluteFill} pointerEvents={manual ? 'auto' : 'none'} onPress={closeManual}>
        {Platform.OS === 'ios' ? (
          <AnimatedBlur tint="dark" intensity={blur.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) as unknown as number} style={StyleSheet.absoluteFill} />
        ) : null}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,26,18,0.78)', opacity: blur.interpolate({ inputRange: [0, 1], outputRange: [0, Platform.OS === 'ios' ? 0.35 : 1] }) }]} />
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[styles.manualTitle, { top: insets.top + 120, opacity: blur, transform: [{ translateY: blur.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}
      >
        <View style={styles.manualIcon}><Ionicons name="keypad" size={30} color="#fff" /></View>
        <Text style={styles.manualHead}>Barkodu yaz</Text>
        <Text style={styles.manualSub}>Ürünün arkasındaki, barkod çizgilerinin altında yazan 8-13 haneli numara</Text>
      </Animated.View>

      {/* Üst bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>Barkod Tara</Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setTorch((t) => !t);
          }}
          style={[styles.roundBtn, torch && { backgroundColor: '#fff' }]}
          accessibilityLabel="Fener"
        >
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color={torch ? colors.ink : '#fff'} />
        </Pressable>
      </View>

      {/* Alt aksiyonlar */}
      <View style={[styles.bottom, { bottom: manual && kb > 0 ? kb + 12 : bottomOffset }]}>
        {manual ? (
          <View style={styles.manualRow}>
            <Pressable onPress={closeManual} style={styles.cancel} accessibilityLabel="Vazgeç">
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 14))}
              placeholder="Barkod numarası"
              placeholderTextColor="#9AA7A0"
              keyboardType="number-pad"
              style={styles.input}
              autoFocus
              onSubmitEditing={submitManual}
              returnKeyType="search"
            />
            <Pressable onPress={submitManual} style={styles.go} accessibilityLabel="Ara">
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <ActionPill icon="keypad-outline" label="Elle gir" onPress={() => setManual(true)} />
            <ActionPill icon="document-text-outline" label="Etiket tara" onPress={() => router.push('/label')} strong />
          </View>
        )}
        <Text style={styles.tip}>Ürün sistemde yoksa etiketteki içindekiler kısmını fotoğrafla, analiz edelim.</Text>
      </View>
    </View>
  );
}

function ActionPill({ icon, label, onPress, strong }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, strong && { backgroundColor: '#fff' }]}>
      <Ionicons name={icon} size={18} color={strong ? colors.ink : '#fff'} />
      <Text style={[styles.pillText, strong && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#0B120E' },
  perm: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, gap: 14, alignItems: 'center' },
  permIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 54, paddingHorizontal: 14, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)' },
  pillText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  tip: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 17 },
  cancel: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  manualTitle: { position: 'absolute', left: 28, right: 28, alignItems: 'center', gap: 10 },
  manualIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  manualHead: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  manualSub: { color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  manualRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  input: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#fff', paddingHorizontal: 20, fontSize: 17, fontWeight: '600', color: colors.ink },
  go: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
