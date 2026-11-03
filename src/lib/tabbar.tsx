import React, { createContext, useContext, useMemo, useState } from 'react';

type Ctx = { height: number; setHeight: (h: number) => void };
const TabBarCtx = createContext<Ctx>({ height: 110, setHeight: () => {} });

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState(110);
  const v = useMemo(() => ({ height, setHeight }), [height]);
  return <TabBarCtx.Provider value={v}>{children}</TabBarCtx.Provider>;
}

/** Yüzen tab bar'ın gerçek (ölçülmüş) yüksekliği. İçerik bu kadar boşluk bırakmalı. */
export const useTabBarHeight = () => useContext(TabBarCtx).height;
export const useSetTabBarHeight = () => useContext(TabBarCtx).setHeight;
