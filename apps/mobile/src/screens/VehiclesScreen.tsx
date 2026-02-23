import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { addVehicle, listVehicles } from '../services/vehicles';
import { useVehicleStore } from '../store/useVehicleStore';
import { listDiagnosesByVehicle } from '../services/diagnoses';
import { computeHealthScore, HealthScore } from '../utils/healthScore';
import { HealthScoreWidget } from '../components/HealthScoreWidget';

type Props = { session: Session };

const FUEL_ICONS: Record<string, string> = {
  petrol: 'flame',
  diesel: 'water',
  hybrid: 'leaf',
  electric: 'flash',
  lpg: 'flame',
  cng: 'flame',
};

export function VehiclesScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { vehicles, selectedVehicleId, setSelectedVehicleId, setVehicles } = useVehicleStore();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [healthScores, setHealthScores] = useState<Record<string, HealthScore>>({});

  const refresh = async () => {
    const data = await listVehicles(session.user.id);
    setVehicles(data);
    // Fetch health scores for all vehicles in parallel
    const entries = await Promise.all(
      data.map(async (v) => {
        const records = await listDiagnosesByVehicle(v.id);
        return [v.id, computeHealthScore(records)] as [string, HealthScore];
      })
    );
    setHealthScores(Object.fromEntries(entries));
  };

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  const onAdd = async () => {
    setError(null);
    if (!make || !model || !year) {
      setError('Make, model and year are required.');
      return;
    }
    setAdding(true);
    try {
      Keyboard.dismiss();
      await addVehicle({
        userId: session.user.id,
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        mileage: mileage ? Number(mileage) : 0,
        fuelType: 'petrol',
      });
      setMake('');
      setModel('');
      setYear('');
      setMileage('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <Gradient
        colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]}
        style={[styles.page, { paddingTop: insets.top + 16 }]}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.pageTitle, { color: tokens.text }]}>My Vehicles</Text>
          <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
          </Text>

          {/* Add vehicle card */}
          <GlassCard backgroundColor={tokens.glass} style={styles.card}>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>Add vehicle</Text>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <GlassInput
                  tokens={tokens}
                  label="Make"
                  value={make}
                  onChangeText={setMake}
                  placeholder="e.g. Ford"
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.halfInput}>
                <GlassInput
                  tokens={tokens}
                  label="Model"
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g. Focus"
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <GlassInput
                  tokens={tokens}
                  label="Year"
                  value={year}
                  onChangeText={setYear}
                  placeholder="2020"
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.halfInput}>
                <GlassInput
                  tokens={tokens}
                  label="Mileage (km)"
                  value={mileage}
                  onChangeText={setMileage}
                  placeholder="50000"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={onAdd}
                />
              </View>
            </View>
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: tokens.danger + '18', borderColor: tokens.danger + '40' },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={14} color={tokens.danger} />
                <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text>
              </View>
            ) : null}
            <PrimaryButton
              label={adding ? 'Adding…' : 'Add vehicle'}
              onPress={onAdd}
              color={tokens.primary}
              disabled={adding}
            />
          </GlassCard>

          {/* Vehicle list */}
          {vehicles.length > 0 ? (
            <View style={styles.listContainer}>
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Your garage</Text>
              {vehicles.map((item) => {
                const selected = selectedVehicleId === item.id;
                const fuelIcon = (FUEL_ICONS[item.fuel_type ?? 'petrol'] ?? 'flame') as any;
                return (
                  <Pressable key={item.id} onPress={() => setSelectedVehicleId(item.id)}>
                    <GlassCard
                      backgroundColor={selected ? tokens.primaryGlow : tokens.glass}
                    >
                      <View style={styles.vehicleRow}>
                        <View
                          style={[
                            styles.vehicleIconBg,
                            {
                              backgroundColor: selected
                                ? tokens.primary + '25'
                                : 'rgba(255,255,255,0.07)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="car-sport"
                            size={22}
                            color={selected ? tokens.primary : tokens.textMuted}
                          />
                        </View>
                        <View style={styles.vehicleInfo}>
                          <Text style={[styles.vehicleName, { color: tokens.text }]}>
                            {item.make} {item.model}
                          </Text>
                          <Text style={[styles.vehicleMeta, { color: tokens.textMuted }]}>
                            {item.year} · {(item.current_mileage ?? 0).toLocaleString()} km
                          </Text>
                        </View>
                        <View style={styles.vehicleRight}>
                          {selected ? (
                            <View
                              style={[
                                styles.activePill,
                                {
                                  backgroundColor: tokens.primary + '22',
                                  borderColor: tokens.primary + '60',
                                },
                              ]}
                            >
                              <Ionicons name="checkmark-circle" size={12} color={tokens.primary} />
                              <Text style={[styles.activePillText, { color: tokens.primary }]}>
                                Active
                              </Text>
                            </View>
                          ) : null}
                          <Ionicons name={fuelIcon} size={14} color={tokens.textMuted} />
                        </View>
                      </View>
                      {healthScores[item.id] && (
                        <HealthScoreWidget
                          health={healthScores[item.id]}
                          textColor={tokens.textMuted}
                          trackColor={tokens.glassBorder}
                        />
                      )}
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </Gradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },
  pageTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginBottom: 2 },
  card: { marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  listContainer: { gap: 10 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '700' },
  vehicleMeta: { fontSize: 13, marginTop: 2 },
  vehicleRight: { alignItems: 'flex-end', gap: 4 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  activePillText: { fontSize: 11, fontWeight: '700' },
});
