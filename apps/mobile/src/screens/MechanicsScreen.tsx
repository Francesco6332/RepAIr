import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { findMechanicsNearby } from '../services/mechanics';
import { MechanicCard } from '@repairo/shared';
import { useVehicleStore } from '../store/useVehicleStore';

export function MechanicsScreen() {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { vehicles, selectedVehicleId } = useVehicleStore();
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];

  const [list, setList] = useState<MechanicCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    setList([]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby mechanics.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const data = await findMechanicsNearby({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        make: selectedVehicle?.make,
      });
      if (data.length === 0) {
        setError('No mechanics found within 10 km. Try a different area.');
      } else {
        setList(data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (item: MechanicCard) => {
    const query = encodeURIComponent(
      item.address !== 'Address unavailable' ? item.address : item.name
    );
    Linking.openURL(`https://www.openstreetmap.org/search?query=${query}`);
  };

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <Gradient
      colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]}
      style={[styles.page, { paddingTop: insets.top + 16 }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.pageTitle, { color: tokens.text }]}>Nearby Mechanics</Text>
        {selectedVehicle ? (
          <View style={styles.vehicleChip}>
            <Ionicons name="car-sport-outline" size={13} color={tokens.textMuted} />
            <Text style={[styles.vehicleChipText, { color: tokens.textMuted }]}>
              {selectedVehicle.make} {selectedVehicle.model}
            </Text>
          </View>
        ) : (
          <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
            All workshops near you
          </Text>
        )}

        {/* Search button */}
        <PrimaryButton
          label={loading ? 'Searching…' : 'Search Workshops'}
          onPress={search}
          color={tokens.primary}
          disabled={loading}
        />

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.primary} />
            <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
              Querying OpenStreetMap…
            </Text>
          </View>
        )}

        {error ? (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: tokens.danger + '18', borderColor: tokens.danger + '40' },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={[styles.alertText, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Results */}
        {list.length > 0 ? (
          <View style={styles.results}>
            <Text style={[styles.resultsLabel, { color: tokens.textMuted }]}>
              {list.length} mechanic{list.length !== 1 ? 's' : ''} found
            </Text>
            {list.map((item) => (
              <GlassCard key={item.id} backgroundColor={tokens.glass}>
                {/* Name & badge */}
                <View style={styles.nameRow}>
                  <Text style={[styles.mechanicName, { color: tokens.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.isOfficialDealer ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: tokens.primary + '25',
                          borderColor: tokens.primary + '50',
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: tokens.primary }]}>Official</Text>
                    </View>
                  ) : null}
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={tokens.textMuted} />
                    <Text style={[styles.metaText, { color: tokens.textMuted }]}>
                      {item.distanceKm.toFixed(1)} km
                    </Text>
                  </View>
                  {item.openingHours ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={tokens.textMuted} />
                      <Text
                        style={[styles.metaText, { color: tokens.textMuted }]}
                        numberOfLines={1}
                      >
                        {item.openingHours}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {item.address !== 'Address unavailable' ? (
                  <Text style={[styles.addressText, { color: tokens.textMuted }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                ) : null}

                {/* Action buttons */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => openMaps(item)}
                    style={[styles.actionBtn, { borderColor: tokens.primary + '70' }]}
                  >
                    <Ionicons name="map-outline" size={14} color={tokens.primary} />
                    <Text style={[styles.actionBtnText, { color: tokens.primary }]}>Map</Text>
                  </Pressable>
                  {item.phone ? (
                    <Pressable
                      onPress={() => callPhone(item.phone!)}
                      style={[styles.actionBtn, { borderColor: tokens.accent + '70' }]}
                    >
                      <Ionicons name="call-outline" size={14} color={tokens.accent} />
                      <Text style={[styles.actionBtnText, { color: tokens.accent }]}>Call</Text>
                    </Pressable>
                  ) : null}
                  {item.website ? (
                    <Pressable
                      onPress={() => Linking.openURL(item.website!)}
                      style={[styles.actionBtn, { borderColor: tokens.warning + '70' }]}
                    >
                      <Ionicons name="globe-outline" size={14} color={tokens.warning} />
                      <Text style={[styles.actionBtnText, { color: tokens.warning }]}>Web</Text>
                    </Pressable>
                  ) : null}
                </View>
              </GlassCard>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },
  pageTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginBottom: 2 },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  vehicleChipText: { fontSize: 13, fontWeight: '500' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 14 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  alertText: { fontSize: 13, fontWeight: '600', flex: 1 },
  results: { gap: 12 },
  resultsLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  mechanicName: { fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  addressText: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});
