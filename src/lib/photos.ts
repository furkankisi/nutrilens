import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import type { CustomProduct } from './store';
import type { Product } from './off';

async function ensureCamera(): Promise<boolean> {
  const cur = await ImagePicker.getCameraPermissionsAsync();
  if (cur.granted) return true;
  const req = await ImagePicker.requestCameraPermissionsAsync();
  if (req.granted) return true;
  Alert.alert('Kamera izni gerekli', 'Fotoğraf çekmek için ayarlardan kamera iznini açmalısın.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Ayarlar', onPress: () => Linking.openSettings() },
  ]);
  return false;
}

async function fromCamera(): Promise<string | null> {
  if (!(await ensureCamera())) return null;
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return r.canceled ? null : r.assets[0].uri;
}

async function fromLibrary(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  return r.canceled ? null : r.assets[0].uri;
}

/** "Kamera / Galeri" seçimi sunar, seçilen fotoğrafın geçici adresini döndürür. */
export function choosePhoto(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: 'Kamera', onPress: () => fromCamera().then(resolve, () => resolve(null)) },
        { text: 'Galeri', onPress: () => fromLibrary().then(resolve, () => resolve(null)) },
        { text: 'İptal', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Fotoğrafı küçültüp kalıcı belge klasörüne kaydeder; dosya adını döndürür. */
export async function persistPhoto(tempUri: string, fileName: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(tempUri).resize({ width: 1400 });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const dest = new File(Paths.document, fileName);
  if (dest.exists) dest.delete();
  new File(out.uri).copy(dest);
  return fileName;
}

/** Dosya adından geçerli adres üretir (iOS'ta klasör yolu değişebildiği için adres saklanmaz). */
export function photoUri(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const f = new File(Paths.document, fileName);
  return f.exists ? f.uri : undefined;
}

export function deletePhoto(fileName?: string) {
  try {
    if (!fileName) return;
    const f = new File(Paths.document, fileName);
    if (f.exists) f.delete();
  } catch {
    /* yoksay */
  }
}

/** Kendi ürününü uygulamanın ortak "Ürün" biçimine çevirir. */
export function customToProduct(c: CustomProduct): Product {
  const front = photoUri(c.frontFile);
  return {
    code: c.id,
    name: c.name,
    brand: c.brand,
    image: front,
    thumb: front,
    ingredientsText: c.ingredientsText,
    analysisTags: [],
    allergens: [],
    traces: [],
    labels: [],
    nutrients: {},
    custom: { id: c.id, barcode: c.barcode, ingredientsImage: photoUri(c.ingredientsFile) },
  };
}
