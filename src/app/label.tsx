import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalysisCard } from '../components/AnalysisCard';
import { PrimaryButton } from '../components/UI';
import { analyze, cleanOcr } from '../lib/analyzer';
import { extractIngredientsSection, OcrError, readTextFromImage } from '../lib/ocr';
import { useStore } from '../lib/store';
import { colors, font, radius, shadow } from '../theme';

type Mode = 'camera' | 'reading' | 'edit' | 'result';

export default function LabelScreen() {
  const params = useLocalSearchParams<{ code?: string; text?: string; title?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { diets, addHistory } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>(params.text ? 'result' : 'camera');
  const [torch, setTorch] = useState(false);
  const [text, setText] = useState(params.text ?? '');
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const saved = useRef(!!params.text); // geçmişten açıldıysa tekrar kaydetme

  const analysis = useMemo(() => analyze({ ingredientsText: text }), [text]);

  useEffect(() => {
    if (mode === 'result' && !saved.current && text.trim()) {
      saved.current = true;
      addHistory({
        id: `label-${Date.now()}`,
        name: params.title || (params.code ? `Etiket · ${params.code}` : 'Etiket analizi'),
        source: 'label',
        ingredientsText: text,
      });
    }
  }, [mode, text, params.title, params.code, addHistory]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const capture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      setMode('reading');
      const raw = await readTextFromImage(photo.uri);
      setText(extractIngredientsSection(cleanOcr(raw)));
      setMode('edit');
    } catch (e) {
      setError(e instanceof OcrError ? e.message : 'Fotoğraf okunamadı. Tekrar dene.');
      setMode('camera');
    } finally {
      setCapturing(false);
    }
  };

  // ------------------------------------------------------------- sonuç
  if (mode === 'result') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
          <Text style={font.display}>Etiket analizi</Text>
          <AnalysisCard analysis={analysis} selected={diets} />
          <View style={styles.box}>
            <Text style={font.heading}>Okunan içerik</Text>
            <Text style={[font.body, { marginTop: 6 }]}>{text}</Text>
          </View>
          <PrimaryButton title="Metni düzelt" icon="create-outline" variant="soft" onPress={() => setMode('edit')} />
          <PrimaryButton title="Yeni etiket tara" icon="camera" onPress={() => { saved.current = false; setText(''); setMode('camera'); }} />
        </ScrollView>
        <CloseBtn onPress={close} top={insets.top + 8} />
      </View>
    );
  }

  // ------------------------------------------------------------ düzenleme
  if (mode === 'edit') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 20, paddingBottom: insets.bottom + 30, gap: 14 }}>
          <Text style={font.display}>İçindekiler</Text>
          <Text style={[font.body, { color: colors.muted }]}>
            Okunan metni kontrol et; yanlış okunan kelimeleri düzeltmek analizi iyileştirir. İstersen içeriği elle de yazabilirsin.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Örn: Buğday unu, şeker, süt tozu, yumurta, E471…"
            placeholderTextColor={colors.muted}
            style={styles.textarea}
            textAlignVertical="top"
            autoFocus={!text}
          />
          <PrimaryButton title="Analiz et" icon="sparkles" onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setMode('result'); }} style={{ opacity: text.trim().length < 3 ? 0.4 : 1 }} loading={false} />
          <PrimaryButton title="Fotoğrafı yeniden çek" icon="camera-outline" variant="soft" onPress={() => setMode('camera')} />
        </ScrollView>
        <CloseBtn onPress={close} top={insets.top + 8} />
      </KeyboardAvoidingView>
    );
  }

  // ------------------------------------------------------------ okuma
  if (mode === 'reading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={font.heading}>İçerik okunuyor…</Text>
        <Text style={font.caption}>Birkaç saniye sürebilir</Text>
      </View>
    );
  }

  // ------------------------------------------------------------ kamera
  if (!permission) return <View style={{ flex: 1, backgroundColor: '#0B120E' }} />;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, paddingHorizontal: 28 }]}>
        <Ionicons name="camera" size={40} color={colors.primary} />
        <Text style={[font.title, { textAlign: 'center' }]}>Kamera izni gerekli</Text>
        <PrimaryButton
          title={permission.canAskAgain ? 'İzin ver' : 'Ayarlardan izin ver'}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={{ alignSelf: 'stretch' }}
        />
        <PrimaryButton title="İçeriği elle yaz" icon="create-outline" variant="soft" onPress={() => setMode('edit')} style={{ alignSelf: 'stretch' }} />
        <CloseBtn onPress={close} top={insets.top + 8} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0B120E' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" autofocus="on" enableTorch={torch} />
      <View pointerEvents="none" style={styles.guideWrap}>
        <View style={styles.guide}>
          <View style={[styles.gc, { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 }]} />
          <View style={[styles.gc, { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
          <View style={[styles.gc, { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 }]} />
          <View style={[styles.gc, { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 }]} />
        </View>
        <View style={styles.hint}>
          <Text style={styles.hintText}>“İçindekiler” yazısını çerçeveye al, net ve aydınlık çek</Text>
        </View>
        {error && (
          <View style={[styles.hint, { backgroundColor: 'rgba(217,58,58,0.92)' }]}>
            <Text style={styles.hintText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => setMode('edit')} style={styles.side} accessibilityLabel="Elle yaz">
          <Ionicons name="create-outline" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={capture} disabled={capturing} style={styles.shutterOuter} accessibilityLabel="Fotoğraf çek">
          {capturing ? <ActivityIndicator color={colors.primaryDark} /> : <View style={styles.shutter} />}
        </Pressable>
        <Pressable onPress={() => setTorch((t) => !t)} style={[styles.side, torch && { backgroundColor: '#fff' }]} accessibilityLabel="Fener">
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={22} color={torch ? colors.ink : '#fff'} />
        </Pressable>
      </View>
      <CloseBtn onPress={close} top={insets.top + 8} dark />
    </View>
  );
}

function CloseBtn({ onPress, top, dark }: { onPress: () => void; top: number; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.close, { top }, dark && { backgroundColor: 'rgba(255,255,255,0.2)' }]} accessibilityLabel="Kapat">
      <Ionicons name="close" size={22} color={dark ? '#fff' : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  close: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  textarea: { minHeight: 200, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16, fontSize: 16, lineHeight: 23, color: colors.ink },
  guideWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
  guide: { width: '88%', height: '42%', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  gc: { position: 'absolute', width: 28, height: 28, borderWidth: 4, borderColor: '#fff', borderRadius: 6 },
  hint: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(8,16,12,0.6)', maxWidth: '88%' },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  side: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutterOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
});
