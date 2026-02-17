import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DiagnoseScreen } from '../screens/DiagnoseScreen';
import { MechanicsScreen } from '../screens/MechanicsScreen';
import { CustomizationScreen } from '../screens/CustomizationScreen';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const preset = useThemeStore((s) => s.preset);
  const tokens = themes[preset];

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tokens.bgAlt,
            borderTopColor: 'rgba(255,255,255,0.08)'
          },
          tabBarActiveTintColor: tokens.primary,
          tabBarInactiveTintColor: tokens.textMuted,
          tabBarIcon: ({ color, size }) => {
            const map: Record<string, string> = {
              Diagnose: 'car-sport-outline',
              Mechanics: 'map-outline',
              Customize: 'color-palette-outline'
            };
            return <Ionicons name={map[route.name] as any} size={size} color={color} />;
          }
        })}
      >
        <Tab.Screen name="Diagnose" component={DiagnoseScreen} />
        <Tab.Screen name="Mechanics" component={MechanicsScreen} />
        <Tab.Screen name="Customize" component={CustomizationScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
