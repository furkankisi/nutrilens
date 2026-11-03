import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeUp } from '../components/FadeUp';
import { PrimaryButton } from '../components/UI';
import { cleanOcr } from '../lib/analyzer';
import { extractIngredientsSection, OcrError, readTextFromImage } from '../lib/ocr';
import { choosePhoto, deletePhoto, persistPhoto, photoUri } from '../lib/photos';
import { useStore, type CustomProduct } from '../lib/store';
import { colors, font, radius, shadow } from '../theme';

export default function AddProductScreen() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string; text?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { custom, saveCustom } = useStore();
  const editing = params.id ? custom.find((c) => c.id === params.id) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [barcode, setBarcode] = useState(editing?.barcode ?? params.barcode ?? '');
  const [text, setText] = useState(editing?.ingredientsText ?? params.text ?? '');
  // Fotoğraflar: yeni seçilen geçici adres ya da düzenlemede mevcut kayıtlı adres
  const [frontTmp, setFrontTmp] = useState<string | null>(null);
  const [ingTmp, setIngTmp] = useState<string | null>(null);
  const frontShown = frontTmp ?? photoUri(editing?.frontFile);
  const ingShown = ingTmp ?? photoUri(editing?.ingredientsFile);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrErr, setOcrErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scroller = useRef<any>(null);

  const pickFront = async () => {
    const uri = await choosePhoto('Ürünün ön yüzü');
    if (uri) setFrontTmp(uri);
  };

  const pickIngredients = async () => {
    const uri = await choosePhoto('İçindekiler yazısı');
    if (!uri) return;
    setIngTmp(uri);
    setOcrErr(null);
    setOcrBusy(true);
    try {
      const raw = await readTextFromImage(uri);
      setText(extractIngredientsSection(cleanOcr(raw)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setOcrErr(e instanceof OcrError ? e.message : 'Yazı okunamadı. İçeriği elle yazabilirsin.');
    } finally {
      setOcrBusy(false);
    }
  };

  const bc = barcode.trim();
  const barcodeBad = bc.length > 0 && !/^\d{6,14}$/.test(bc);
  const canSave = name.trim().length >= 2 && text.trim().length >= 3 && !barcodeBad && !ocrBusy && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = editing?.id ?? `my-${Date.now()}`;
      let frontFile = editing?.frontFile;
      let ingredientsFile = editing?.ingredientsFile;
      if (frontTmp) {
        frontFile = await persistPhoto(frontTmp, `${id}-front-${Date.now()}.jpg`);
        if (editing?.frontFile) deletePhoto(editing.frontFile);
      }
      if (ingTmp) {
        ingredientsFile = await persistPhoto(ingTmp, `${id}-ing-${Date.now()}.jpg`);
        if (editing?.ingredientsFile) deletePhoto(editing.ingredientsFile);
      }
      const product: CustomProduct = {
        id,
        barcode: bc || undefined,
        name: name.trim(),
        brand: brand.trim() || undefined,
        frontFile,
        ingredientsFile,
        ingredientsText: text.trim(),
        createdAt: editing?.createdAt ?? Date.now(),
      };
      saveCustom(product);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace({ pathname: '/product/[code]', params: { code: id } });
    } catch {
      Alert.alert('Kaydedilemedi', 'Fotoğraflar kaydedilirken bir sorun oluştu. Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }}>
        <FadeUp>
          <Text style={font.display}>{editing ? 'Ürünü düzenle' : 'Ürün ekle'}</Text>
          <Text style={[font.body, { color: colors.muted, marginTop: 6 }]}>
            Ön yüz ve içindekiler fotoğrafını çek; içeriği okuyup analiz edelim. Ürün senin listene ve ana sayfaya eklenir.
          </Text>
        </FadeUp>

        <FadeUp delay={80}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PhotoSlot title="Ön yüz" icon="cube-outline" uri={frontShown} onPress={pickFront} />
            <PhotoSlot title="İçindekiler" icon="document-text-outline" uri={ingShown} onPress={pickIngredients} busy={ocrBusy} />
          </View>
        </FadeUp>

        {ocrBusy && (
          <View style={styles.info}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[font.body, { flex: 1, color: colors.primaryDark, fontWeight: '700' }]}>İçerik fotoğraftan okunuyor…</Text>
          </View>
        )}
        {ocrErr && (
          <View style={[styles.info, { backgroundColor: colors.badSoft }]}>
            <Ionicons name="alert-circle" size={24} color={colors.bad} />
            <Text style={[font.body, { flex: 1, color: colors.ink }]}>{ocrErr}</Text>
          </View>
        )}

        <FadeUp delay={160} style={styles.card}>
          <Field label="Ürün adı *" value={name} onChangeText={setName} placeholder="Örn: Ev yapımı granola" />
          <Field label="Marka" value={brand} onChangeText={setBrand} placeholder="İsteğe bağlı" />
          <Field
            label="Barkod"
            value={barcode}
            onChangeText={(t) => setBarcode(t.replace(/\D/g, '').slice(0, 14))}
            placeholder="Yoksa boş bırak"
            keyboardType="number-pad"
            error={barcodeBad ? 'Barkod 6-14 haneli rakam olmalı' : undefined}
          />
        </FadeUp>

        <FadeUp delay={240} style={styles.card}>
          <Text style={styles.label}>İçindekiler</Text>
          <Text style={[font.caption, { marginBottom: 8 }]}>Fotoğraftan okunan metni kontrol et ya da kendin yaz.</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Örn: Yulaf, bal, badem, hindistan cevizi yağı, tuz"
            placeholderTextColor={colors.muted}
            style={styles.textarea}
            textAlignVertical="top"
            onFocus={() => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 250)}
          />
        </FadeUp>

        <PrimaryButton title={editing ? 'Kaydet' : 'Kaydet ve analiz et'} icon="sparkles" onPress={save} loading={saving} style={{ opacity: canSave ? 1 : 0.4 }} />
      </ScrollView>

      <Pressable onPress={close} style={[styles.close, { top: insets.top + 8 }]} accessibilityLabel="Kapat">
        <Ionicons name="close" size={24} color={colors.ink} />
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function PhotoSlot({ title, icon, uri, onPress, busy }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; uri?: string | null; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.slot, { transform: [{ scale: pressed ? 0.97 : 1 }] }, uri ? { borderStyle: 'solid', borderColor: colors.primary } : null]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <View style={styles.slotBadge}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh" size={16} color="#fff" />}
            <Text style={styles.slotBadgeText}>{title}</Text>
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={styles.slotIcon}><Ionicons name={icon} size={30} color={colors.primary} /></View>
          <Text style={styles.slotTitle}>{title}</Text>
          <Text style={font.caption}>Fotoğraf ekle</Text>
        </View>
      )}
    </Pressable>
  );
}

function Field({ label, error, ...rest }: { label: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...rest} placeholderTextColor={colors.muted} style={[styles.input, error ? { borderColor: colors.bad } : null]} />
      {error ? <Text style={{ color: colors.bad, fontSize: 13, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', left: 16, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  slot: { flex: 1, aspectRatio: 1, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  slotTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  slotBadge: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5,59,40,0.78)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  slotBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14, ...shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { fontSize: 16, fontWeight: '800', color: colors.ink },
  input: { height: 54, borderRadius: 16, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, fontSize: 18, fontWeight: '600', color: colors.ink },
  textarea: { minHeight: 140, borderRadius: 16, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, padding: 16, fontSize: 17, lineHeight: 25, color: colors.ink },
});
