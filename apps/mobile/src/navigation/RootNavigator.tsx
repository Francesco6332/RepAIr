import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import { DiagnoseScreen } from '../screens/DiagnoseScreen';
import { MechanicsScreen } from '../screens/MechanicsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { VehiclesScreen } from '../screens/VehiclesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PricingScreen } from '../screens/PricingScreen';
import { GdprConsentScreen } from '../screens/GdprConsentScreen';
import { GlassTabBar } from './GlassTabBar';

type TabParamList = {
  Diagnose: undefined;
  Vehicles: undefined;
  Mechanics: undefined;
  History: undefined;
  Profile: undefined;
};

type OnboardingStackParamList = {
  OnboardingSlides: undefined;
  Pricing: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function AppTabs({ session }: { session: Session }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Diagnose">{() => <DiagnoseScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Vehicles">{() => <VehiclesScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Mechanics" component={MechanicsScreen} />
      <Tab.Screen name="History">{() => <HistoryScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <ProfileScreen session={session} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <OnboardingStack.Screen name="OnboardingSlides">
        {({ navigation }) => (
          <OnboardingScreen onContinue={() => navigation.navigate('Pricing')} />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="Pricing">
        {() => <PricingScreen onComplete={onComplete} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

type RootNavigatorProps = {
  session: Session | null;
  needsOnboarding: boolean;
  onOnboardingComplete: () => void;
  gdprAccepted: boolean;
  onGdprAccept: () => void;
};

export function RootNavigator({
  session,
  needsOnboarding,
  onOnboardingComplete,
  gdprAccepted,
  onGdprAccept,
}: RootNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!gdprAccepted ? (
          <Stack.Screen name="GdprConsent">
            {() => <GdprConsentScreen onAccept={onGdprAccept} />}
          </Stack.Screen>
        ) : !session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingFlow onComplete={onOnboardingComplete} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="App">{() => <AppTabs session={session} />}</Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
