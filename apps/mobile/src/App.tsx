import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { RootNavigator } from './navigation/RootNavigator';
import { supabase } from './services/supabase';
import { registerForPushNotifications } from './services/notifications';

const ONBOARDED_KEY = '@repairo/onboarded_v1';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Check onboarding status whenever the user changes
  useEffect(() => {
    if (!session) return;
    const key = `${ONBOARDED_KEY}_${session.user.id}`;
    AsyncStorage.getItem(key)
      .then((val) => setNeedsOnboarding(val !== 'true'))
      .catch(() => setNeedsOnboarding(false));
  }, [session?.user.id]);

  // Register for push notifications after login
  useEffect(() => {
    if (!session) return;
    registerForPushNotifications(session.user.id).catch(() => {});
  }, [session?.user.id]);

  const handleOnboardingComplete = async () => {
    if (!session) return;
    await AsyncStorage.setItem(`${ONBOARDED_KEY}_${session.user.id}`, 'true');
    setNeedsOnboarding(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080B12' }}>
        <ActivityIndicator size="large" color="#34D399" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator
        session={session}
        needsOnboarding={needsOnboarding}
        onOnboardingComplete={handleOnboardingComplete}
      />
    </SafeAreaProvider>
  );
}
