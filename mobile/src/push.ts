// ============================================================
// HEARING THE KNOCK — src/push.ts
//
// The client half of elle-worker src/push.ts: ask permission, fetch the Expo
// push token, hand it to the worker. Registration is best-effort and silent
// in failure — a phone that can't receive knocks still opens the door. The
// EAS projectId comes from app config; until the project is linked to EAS
// (Stewart's `eas init`), registration is a clean no-op.
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { me } from './api';

// A knock arriving while the app is open still shows: she chose to send it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// The token this install registered, so sign-out can release it. A device
// that stays registered after sign-out keeps receiving the OLD account's
// knocks — the registration must not outlive the session that made it.
let registeredExpoToken: string | null = null;

export async function registerForKnocks(authToken: string): Promise<boolean> {
  try {
    if (!Device.isDevice) return false; // simulators have no push transport
    const projectId: string | undefined =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return false; // not linked to EAS yet — no-op, never an error

    const perm = await Notifications.getPermissionsAsync();
    const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('knocks', {
        name: 'Elle',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await me.registerPush(authToken, token, Platform.OS);
    registeredExpoToken = token;
    return true;
  } catch {
    return false;
  }
}

// Release this device's registration — called on sign-out, while the auth
// token is still valid. Best-effort: a failure here must never block the
// sign-out itself (the worker's DeviceNotRegistered sweep is the backstop).
export async function unregisterForKnocks(authToken: string): Promise<void> {
  if (!registeredExpoToken) return;
  try {
    await me.unregisterPush(authToken, registeredExpoToken);
    registeredExpoToken = null;
  } catch { /* best-effort */ }
}

// Did a knock LAUNCH the app from a killed state? The response listener in
// onKnockOpened only exists after mount, so the tap that started the app is
// never delivered to it — it lives in the last-response slot instead.
export async function coldStartKnock(): Promise<boolean> {
  try {
    return !!(await Notifications.getLastNotificationResponseAsync());
  } catch {
    return false;
  }
}

// Fires when the person taps a knock — the app answers by opening the Thread.
export function onKnockOpened(handler: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => handler());
  return () => sub.remove();
}
