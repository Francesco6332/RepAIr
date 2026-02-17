import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import { useThemeStore } from '../store/useThemeStore';
import { ThemePreset, themes } from '../theme/tokens';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';

const presets = Object.keys(themes) as ThemePreset[];

export function CustomizationScreen() {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const { preset, setPreset } = useThemeStore();
  const tokens = useMemo(() => themes[preset], [preset]);

  return (
    <Gradient colors={[tokens.bg, tokens.bgAlt]} style={styles.page}>
      <Text style={[styles.title, { color: tokens.text }]}>Customization</Text>
      <GlassCard backgroundColor={tokens.glass}>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>Automotive presets</Text>
        <View style={styles.grid}>
          {presets.map((item) => {
            const palette = themes[item];
            const selected = item === preset;
            return (
              <Pressable
                key={item}
                style={[styles.swatch, { borderColor: selected ? palette.primary : 'rgba(255,255,255,0.15)' }]}
                onPress={() => setPreset(item)}
              >
                <Gradient colors={[palette.bg, palette.primary]} style={styles.swatchInner}>
                  <Text style={styles.swatchText}>{palette.name}</Text>
                </Gradient>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <PrimaryButton label="Sign out" onPress={() => supabase.auth.signOut()} color={tokens.warning} />
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 18,
    gap: 16
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24
  },
  subtitle: {
    marginBottom: 10,
    fontWeight: '600'
  },
  grid: {
    gap: 10
  },
  swatch: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  swatchInner: {
    padding: 14
  },
  swatchText: {
    color: '#fff',
    fontWeight: '700'
  }
});
