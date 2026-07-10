// ============================================================
// THE DOOR — App.tsx
//
// Four surfaces, one swipe apart, in order of primacy:
//   Arrival ⇄ Thread ⇄ Her Day ⇄ You
// No tab bar of features, no hamburger — a horizontal pager and four gold
// dots. The app opens on HER (Arrival); a tapped knock (push) opens straight
// into the Thread where her words already sit. The Electron workbench stays
// the admin console; this is the door everyone else holds.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { BarlowCondensed_400Regular, BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { AuthProvider, useAuth } from './src/auth';
import { coldStartKnock, onKnockOpened, registerForKnocks } from './src/push';
import { Arrival } from './src/surfaces/Arrival';
import { Day } from './src/surfaces/Day';
import { Login } from './src/surfaces/Login';
import { Thread } from './src/surfaces/Thread';
import { You } from './src/surfaces/You';
import { colors } from './src/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const PAGES = ['arrival', 'thread', 'day', 'you'] as const;
const THREAD_PAGE = 1;

function Door() {
  const { token } = useAuth();
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  // Hearing the knock: register this device, and answer a tapped
  // notification by opening the Thread — her words are already in it. The
  // listener only covers taps while the app is alive; a knock that LAUNCHED
  // the app from a killed state lives in the last-response slot instead, so
  // check that once on mount or the very tap that opened the door lands on
  // Arrival instead of her message.
  useEffect(() => {
    if (!token) return;
    void registerForKnocks(token);
    void coldStartKnock().then((launchedByKnock) => {
      if (launchedByKnock) pagerRef.current?.setPage(THREAD_PAGE);
    });
    return onKnockOpened(() => pagerRef.current?.setPage(THREAD_PAGE));
  }, [token]);

  return (
    <View style={styles.root}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={e => setPage(e.nativeEvent.position)}
      >
        <View key="arrival" style={styles.page}>
          <Arrival onEnterThread={() => pagerRef.current?.setPage(THREAD_PAGE)} />
        </View>
        <View key="thread" style={styles.page}><Thread /></View>
        <View key="day" style={styles.page}><Day /></View>
        <View key="you" style={styles.page}><You /></View>
      </PagerView>
      <View style={styles.dots}>
        {PAGES.map((p, i) => (
          <View key={p} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

function Gate() {
  const { restoring, token } = useAuth();
  if (restoring) return <View style={styles.root} />;
  return token ? <Door /> : <Login />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <StatusBar style="light" />
          <Gate />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  page: { flex: 1 },
  dots: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    flexDirection: 'row', gap: 6,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.dim, opacity: 0.5 },
  dotOn: { backgroundColor: colors.gold, opacity: 1 },
});
