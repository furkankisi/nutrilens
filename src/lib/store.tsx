import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DietId } from './analyzer';
import type { Product } from './off';

export type HistoryItem = {
  id: string; // barkod ya da "label-<ts>"
  name: string;
  brand?: string;
  thumb?: string;
  source: 'barcode' | 'label';
  ingredientsText?: string;
  scannedAt: number;
};

export type CustomProduct = {
  id: string; // "my-<ts>"
  barcode?: string;
  name: string;
  brand?: string;
  frontFile?: string; // belge klasöründeki dosya adı
  ingredientsFile?: string;
  ingredientsText: string;
  createdAt: number;
};

export type BodyProfile = {
  weight: string;
  height: string;
  age: string;
  sex: 'f' | 'm';
  activity: number; // 0..4
  goal: 'lose' | 'keep' | 'gain';
};
export const DEFAULT_BODY: BodyProfile = { weight: '', height: '', age: '', sex: 'm', activity: 2, goal: 'keep' };

type Store = {
  custom: CustomProduct[];
  saveCustom: (p: CustomProduct) => void;
  removeCustom: (id: string) => void;
  body: BodyProfile;
  setBody: (patch: Partial<BodyProfile>) => void;
  ready: boolean;
  history: HistoryItem[];
  diets: DietId[];
  addHistory: (item: Omit<HistoryItem, 'scannedAt'>) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  toggleDiet: (id: DietId) => void;
};

const Ctx = createContext<Store | null>(null);
const HISTORY_KEY = 'nutrilens.history.v1';
const DIETS_KEY = 'nutrilens.diets.v1';
const CUSTOM_KEY = 'nutrilens.custom.v1';
const BODY_KEY = 'nutrilens.body.v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [diets, setDiets] = useState<DietId[]>([]);
  const [custom, setCustom] = useState<CustomProduct[]>([]);
  const [body, setBodyState] = useState<BodyProfile>(DEFAULT_BODY);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, d, c, b] = await Promise.all([
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(DIETS_KEY),
          AsyncStorage.getItem(CUSTOM_KEY),
          AsyncStorage.getItem(BODY_KEY),
        ]);
        if (h) setHistory(JSON.parse(h));
        if (d) setDiets(JSON.parse(d));
        if (c) setCustom(JSON.parse(c));
        if (b) setBodyState({ ...DEFAULT_BODY, ...JSON.parse(b) });
      } catch {
        /* bozuk veri: boş başla */
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => {});
  }, [history]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(DIETS_KEY, JSON.stringify(diets)).catch(() => {});
  }, [diets]);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)).catch(() => {});
  }, [custom]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(BODY_KEY, JSON.stringify(body)).catch(() => {});
  }, [body]);

  const saveCustom = useCallback((p: CustomProduct) => setCustom((prev) => [p, ...prev.filter((x) => x.id !== p.id)]), []);
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((x) => x.id !== id));
    setHistory((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const setBody = useCallback((patch: Partial<BodyProfile>) => setBodyState((p) => ({ ...p, ...patch })), []);

  const addHistory = useCallback((item: Omit<HistoryItem, 'scannedAt'>) => {
    setHistory((prev) => [{ ...item, scannedAt: Date.now() }, ...prev.filter((p) => p.id !== item.id)].slice(0, 100));
  }, []);
  const removeHistory = useCallback((id: string) => setHistory((p) => p.filter((x) => x.id !== id)), []);
  const clearHistory = useCallback(() => setHistory([]), []);
  const toggleDiet = useCallback(
    (id: DietId) => setDiets((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    [],
  );

  const value = useMemo(
    () => ({ ready, history, diets, addHistory, removeHistory, clearHistory, toggleDiet, custom, saveCustom, removeCustom, body, setBody }),
    [ready, history, diets, addHistory, removeHistory, clearHistory, toggleDiet, custom, saveCustom, removeCustom, body, setBody],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider eksik');
  return v;
}
