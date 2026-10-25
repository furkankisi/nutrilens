import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { GlassTabBar } from '../../components/GlassTabBar';
import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Keşfet' }} />
      <Tabs.Screen name="scan" options={{ title: 'Tara' }} />
      <Tabs.Screen name="history" options={{ title: 'Geçmiş' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
