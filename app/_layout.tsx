import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, AppContext } from '../src/context/AppContext';
import { useTheme } from '../src/hooks/useTheme';
import { useContext, useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

const RootLayoutInternal = () => {
  const { darkMode } = useTheme();
  const context = useContext(AppContext);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!context || context.state.loadingAuth) return;

    const inAuthGroup = segments[0] === 'login';

    if (!context.state.isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (context.state.isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [context?.state.isAuthenticated, context?.state.loadingAuth, segments]);

  if (!context || context.state.loadingAuth) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkMode ? '#0F0F14' : '#F8F9FA' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="stash-review" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
    </>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootLayoutInternal />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
