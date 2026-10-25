import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScannerOverlay, type Box } from '../../components/ScannerOverlay';
import { PrimaryButton } from '../../components/UI';
import { isValidProductBarcode } from '../../lib/ean';
import { colors, font, TAB_BAR_SPACE } from '../../theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [torch, setTorch] = useState(false);
  const [locked, setLocked] = useState<Box | null>(null);
  const [detected, setDetected] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const busy = useRef(false);

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
          onBarcodeScanned={detected ? undefined : onScanned}
        />
      )}
      <ScannerOverlay locked={locked} detected={detected} hint="Barkodu çerçevenin içine getir" />

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.bottom, { paddingBottom: TAB_BAR_SPACE + 4 }]}>
        {manual ? (
          <View style={styles.manualRow}>
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
      </KeyboardAvoidingView>
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
  topTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)' },
  pillText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tip: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, textAlign: 'center', maxWidth: 300, lineHeight: 17 },
  manualRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  input: { flex: 1, height: 50, borderRadius: 25, backgroundColor: '#fff', paddingHorizontal: 20, fontSize: 17, fontWeight: '600', color: colors.ink },
  go: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
