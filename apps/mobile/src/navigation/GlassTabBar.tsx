import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { active: IoniconName; inactive: IoniconName; label: string }> = {
  Diagnose: { active: 'car-sport', inactive: 'car-sport-outline', label: 'Diagnose' },
  Vehicles: { active: 'car', inactive: 'car-outline', label: 'Vehicles' },
  Mechanics: { active: 'map', inactive: 'map-outline', label: 'Nearby' },
  History: { active: 'time', inactive: 'time-outline', label: 'History' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline', label: 'Profile' },
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {/* Blur layer */}
      <GlassBlur intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Dark tint */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6, 10, 18, 0.72)' }]} />

      {/* Top border shimmer */}
      <View style={[styles.topBorder, { backgroundColor: tokens.glassBorder }]} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            active: 'ellipse' as IoniconName,
            inactive: 'ellipse-outline' as IoniconName,
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}
            >
              {/* Active pill bg */}
              <View
                style={[
                  styles.iconPill,
                  isFocused && { backgroundColor: tokens.primaryGlow },
                ]}
              >
                <Ionicons
                  name={isFocused ? config.active : config.inactive}
                  size={22}
                  color={isFocused ? tokens.primary : tokens.textMuted}
                />
              </View>

              <Text
                style={[styles.label, { color: isFocused ? tokens.primary : tokens.textMuted }]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  iconPill: {
    width: 50,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
