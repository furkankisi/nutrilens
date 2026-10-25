import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DietId } from './analyzer';

export type HistoryItem = {
  id: string; // barkod ya da "label-<ts>"
  name: string;
  brand?: string;
  thumb?: string;
  source: 'barcode' | 'label';
  ingredientsText?: string;
  scannedAt: number;
};

type Store = {
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [diets, setDiets] = useState<DietId[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [h, d] = await Promise.all([AsyncStorage.getItem(HISTORY_KEY), AsyncStorage.getItem(DIETS_KEY)]);
        if (h) setHistory(JSON.parse(h));
        if (d) setDiets(JSON.parse(d));
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
    () => ({ ready, history, diets, addHistory, removeHistory, clearHistory, toggleDiet }),
    [ready, history, diets, addHistory, removeHistory, clearHistory, toggleDiet],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider eksik');
  return v;
}
