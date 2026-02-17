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
import { GlassTabBar } from './GlassTabBar';

type TabParamList = {
  Diagnose: undefined;
  Vehicles: undefined;
  Mechanics: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

function AppTabs({ session }: { session: Session }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Diagnose">{() => <DiagnoseScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Vehicles">{() => <VehiclesScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Mechanics" component={MechanicsScreen} />
      <Tab.Screen name="Profile">{() => <ProfileScreen session={session} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigator({ session }: { session: Session | null }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="App">{() => <AppTabs session={session} />}</Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
