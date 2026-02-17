import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { findNearbyMechanics } from '../services/api';
import { MechanicCard } from '@repairo/shared';

export function MechanicsScreen() {
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const [list, setList] = useState<MechanicCard[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLoading(false);
      return;
    }

    const current = await Location.getCurrentPositionAsync({});
    const data = await findNearbyMechanics({
      lat: current.coords.latitude,
      lng: current.coords.longitude,
      make: 'Ford'
    });

    setList(data);
    setLoading(false);
  };

  return (
    <LinearGradient colors={[tokens.bg, tokens.bgAlt]} style={styles.page}>
      <Text style={[styles.title, { color: tokens.text }]}>Nearby Mechanics</Text>
      <PrimaryButton label="Find top-rated nearby" onPress={search} color={tokens.primary} />
      {loading ? <ActivityIndicator size="large" color={tokens.accent} /> : null}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <GlassCard backgroundColor={tokens.glass}>
            <Text style={[styles.name, { color: tokens.text }]}>{item.name}</Text>
            <Text style={{ color: tokens.textMuted }}>
              {item.rating}★ ({item.reviewCount}) • {item.distanceKm.toFixed(1)} km
            </Text>
            <Text style={{ color: tokens.textMuted }}>{item.address}</Text>
            {item.isOfficialDealer ? <Text style={{ color: tokens.primary }}>Official Dealer</Text> : null}
          </GlassCard>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 18,
    gap: 12
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24
  },
  list: {
    gap: 10,
    paddingBottom: 24
  },
  name: {
    fontWeight: '700',
    marginBottom: 4
  }
});
