import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show alerts while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return; // simulators don't support push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RepAIro',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a78bfa',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) return;

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!tokenData) return;

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token: tokenData,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function scheduleLocalDiagnosisAlert(
  urgency: string,
  issue: string
): Promise<void> {
  if (urgency !== 'high' && urgency !== 'critical') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: urgency === 'critical' ? '⚠️ Critical issue detected' : 'High urgency issue detected',
      body: issue,
      sound: true,
    },
    trigger: null, // fire immediately
  });
}
