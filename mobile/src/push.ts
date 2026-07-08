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
    return true;
  } catch {
    return false;
  }
}

// Fires when the person taps a knock — the app answers by opening the Thread.
export function onKnockOpened(handler: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => handler());
  return () => sub.remove();
}
