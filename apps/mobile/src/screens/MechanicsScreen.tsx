import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
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
import { PaywallModal } from '../components/PaywallModal';
import { useThemeStore } from '../store/useThemeStore';
import { themes, ThemeTokens } from '../theme/tokens';
import { ADDRESS_UNAVAILABLE, findMechanicsNearby } from '../services/mechanics';
import { shareDiagnosisPdf } from '../utils/buildDiagnosisPdf';
import { getCurrentPlan } from '../services/usage';
import { MechanicCard } from '@repairo/shared';
import { useVehicleStore } from '../store/useVehicleStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPreventivoMessage(
  mechanic: MechanicCard,
  vehicle?: { make: string; model: string; year: number },
  issue?: string
): string {
  const lines: string[] = ['Buongiorno,'];
  if (vehicle) {
    lines.push(
      `Vi contatto riguardo al mio veicolo: ${vehicle.make} ${vehicle.model} ${vehicle.year}.`
    );
  }
  if (issue) {
    lines.push(`\nDiagnosi RepAIr: ${issue}`);
  }
  lines.push(
    '\nVorrei richiedere un preventivo per la riparazione. Potreste indicarmi disponibilità e costi indicativi?'
  );
  lines.push('\nGrazie mille.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// PreventivoModal
// ---------------------------------------------------------------------------

type PreventivoModalProps = {
  visible: boolean;
  onClose: () => void;
  mechanic: MechanicCard | null;
  message: string;
  tokens: ThemeTokens;
};

function PreventivoModal({ visible, onClose, mechanic, message, tokens }: PreventivoModalProps) {
  if (!mechanic) return null;

  const shareNative = () => {
    Share.share({ message, title: `Preventivo — ${mechanic.name}` });
  };

  const shareWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const phone = mechanic.phone?.replace(/\D/g, '') ?? '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    Linking.openURL(url).catch(() => shareNative());
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Richiesta preventivo — ${mechanic.name}`);
    const body = encodeURIComponent(message);
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: tokens.bgAlt }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: tokens.glassBorder }]} />

          <Text style={[styles.modalTitle, { color: tokens.text }]}>Richiedi preventivo</Text>
          <Text style={[styles.modalSubtitle, { color: tokens.textMuted }]}>{mechanic.name}</Text>

          {/* Message preview */}
          <View
            style={[
              styles.msgPreview,
              { backgroundColor: tokens.glass, borderColor: tokens.glassBorder },
            ]}
          >
            <Text style={[styles.msgText, { color: tokens.textMuted }]} numberOfLines={6}>
              {message}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionTiles}>
            <Pressable
              onPress={shareNative}
              style={[styles.actionTile, { backgroundColor: tokens.primary + '18', borderColor: tokens.primary + '40' }]}
            >
              <Ionicons name="share-outline" size={22} color={tokens.primary} />
              <Text style={[styles.actionTileLabel, { color: tokens.primary }]}>Condividi</Text>
            </Pressable>

            <Pressable
              onPress={shareWhatsApp}
              style={[styles.actionTile, { backgroundColor: '#25D36618', borderColor: '#25D36640' }]}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={[styles.actionTileLabel, { color: '#25D366' }]}>WhatsApp</Text>
            </Pressable>

            <Pressable
              onPress={shareEmail}
              style={[styles.actionTile, { backgroundColor: tokens.accent + '18', borderColor: tokens.accent + '40' }]}
            >
              <Ionicons name="mail-outline" size={22} color={tokens.accent} />
              <Text style={[styles.actionTileLabel, { color: tokens.accent }]}>Email</Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: tokens.textMuted }]}>Annulla</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function MechanicsScreen() {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { vehicles, selectedVehicleId, lastDiagnosis } = useVehicleStore();
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];

  const [list, setList] = useState<MechanicCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preventivoTarget, setPreventivoTarget] = useState<MechanicCard | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pdfTarget, setPdfTarget] = useState<MechanicCard | null>(null);

  const verifiedCount = list.filter((m) => m.isVerifiedRepAIro).length;

  const search = async () => {
    setLoading(true);
    setError(null);
    setList([]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Autorizzazione alla posizione necessaria per trovare officine vicine.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const data = await findMechanicsNearby({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        make: selectedVehicle?.make,
      });
      if (data.length === 0) {
        setError('Nessuna officina trovata nel raggio di 10 km. Prova un\'altra zona.');
      } else {
        setList(data);
      }
    } catch (e) {
      const message = (e as Error).message;
      if (message === 'SERVIZIO_OFFICINE_TEMP_UNAVAILABLE' || message.includes('Overpass')) {
        setError('Servizio mappe temporaneamente non disponibile. Riprova tra qualche minuto.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (item: MechanicCard) => {
    const query = encodeURIComponent(
      item.address !== ADDRESS_UNAVAILABLE ? item.address : item.name
    );
    Linking.openURL(`https://www.openstreetmap.org/search?query=${query}`);
  };

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);

  const handlePreventivo = (item: MechanicCard) => {
    setPreventivoTarget(item);
  };

  const handleSendReport = async (item: MechanicCard) => {
    if (!lastDiagnosis) return;
    const plan = await getCurrentPlan();
    if (plan === 'free') {
      setPdfTarget(item);
      setPaywallVisible(true);
      return;
    }
    if (!selectedVehicle) return;
    await shareDiagnosisPdf({
      vehicle: `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}`,
      date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
      probableIssue: lastDiagnosis.probableIssue,
      confidence: lastDiagnosis.confidence,
      urgency: lastDiagnosis.urgency,
      costMin: lastDiagnosis.estimatedCostMin,
      costMax: lastDiagnosis.estimatedCostMax,
      safetyAdvice: lastDiagnosis.safetyAdvice,
      nextChecks: lastDiagnosis.nextChecks,
      canDrive: lastDiagnosis.canDrive,
      topCauses: lastDiagnosis.topCauses,
      userChecks: lastDiagnosis.userChecks,
      ignoreRisks: lastDiagnosis.ignoreRisks,
      estimatedTimeMin: lastDiagnosis.estimatedTimeMin,
      estimatedTimeMax: lastDiagnosis.estimatedTimeMax,
      mechanicQuestions: lastDiagnosis.mechanicQuestions,
    });
  };

  const preventivoMessage = preventivoTarget
    ? buildPreventivoMessage(
        preventivoTarget,
        selectedVehicle
          ? { make: selectedVehicle.make, model: selectedVehicle.model, year: selectedVehicle.year }
          : undefined,
        lastDiagnosis?.probableIssue
      )
    : '';

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
        <Text style={[styles.pageTitle, { color: tokens.text }]}>Officine vicine</Text>
        {selectedVehicle ? (
          <View style={styles.vehicleChip}>
            <Ionicons name="car-sport-outline" size={13} color={tokens.textMuted} />
            <Text style={[styles.vehicleChipText, { color: tokens.textMuted }]}>
              {selectedVehicle.make} {selectedVehicle.model}
            </Text>
          </View>
        ) : (
          <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
            Tutte le officine nelle vicinanze
          </Text>
        )}

        {/* Diagnosis banner */}
        {lastDiagnosis && (
          <View
            style={[
              styles.diagnosisBanner,
              { backgroundColor: tokens.primary + '15', borderColor: tokens.primary + '35' },
            ]}
          >
            <Ionicons name="hardware-chip-outline" size={15} color={tokens.primary} />
            <View style={styles.diagnosisBannerText}>
              <Text style={[styles.diagnosisBannerLabel, { color: tokens.primary }]}>
                Ultima diagnosi RepAIr
              </Text>
              <Text style={[styles.diagnosisBannerIssue, { color: tokens.text }]} numberOfLines={2}>
                {lastDiagnosis.probableIssue}
              </Text>
            </View>
          </View>
        )}

        {/* Search button */}
        <PrimaryButton
          label={loading ? 'Ricerca in corso…' : 'Cerca officine'}
          onPress={search}
          color={tokens.primary}
          disabled={loading}
        />

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.primary} />
            <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
              Ricerca su OpenStreetMap…
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
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsLabel, { color: tokens.textMuted }]}>
                {list.length} officin{list.length !== 1 ? 'e' : 'a'} trovat{list.length !== 1 ? 'e' : 'a'}
              </Text>
              {verifiedCount > 0 && (
                <View
                  style={[
                    styles.verifiedBadge,
                    { backgroundColor: tokens.primary + '20', borderColor: tokens.primary + '50' },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={11} color={tokens.primary} />
                  <Text style={[styles.verifiedBadgeText, { color: tokens.primary }]}>
                    {verifiedCount} verificat{verifiedCount !== 1 ? 'e' : 'a'} da RepAIro
                  </Text>
                </View>
              )}
            </View>

            {list.map((item) => (
              <GlassCard key={item.id} backgroundColor={tokens.glass}>
                {/* Name row */}
                <View style={styles.nameRow}>
                  <Text style={[styles.mechanicName, { color: tokens.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.badgeStack}>
                    {item.isVerifiedRepAIro && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: tokens.primary + '22',
                            borderColor: tokens.primary + '55',
                          },
                        ]}
                      >
                        <Ionicons name="shield-checkmark" size={10} color={tokens.primary} />
                        <Text style={[styles.badgeText, { color: tokens.primary }]}>RepAIro</Text>
                      </View>
                    )}
                    {item.isOfficialDealer && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: tokens.primary + '22',
                            borderColor: tokens.primary + '50',
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: tokens.primary }]}>Ufficiale</Text>
                      </View>
                    )}
                  </View>
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

                {item.address !== ADDRESS_UNAVAILABLE ? (
                  <Text style={[styles.addressText, { color: tokens.textMuted }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                ) : null}

                {/* Standard action buttons */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => openMaps(item)}
                    style={[styles.actionBtn, { borderColor: tokens.primary + '70' }]}
                  >
                    <Ionicons name="map-outline" size={14} color={tokens.primary} />
                    <Text style={[styles.actionBtnText, { color: tokens.primary }]}>Mappa</Text>
                  </Pressable>
                  {item.phone ? (
                    <Pressable
                      onPress={() => callPhone(item.phone!)}
                      style={[styles.actionBtn, { borderColor: tokens.accent + '70' }]}
                    >
                      <Ionicons name="call-outline" size={14} color={tokens.accent} />
                      <Text style={[styles.actionBtnText, { color: tokens.accent }]}>Chiama</Text>
                    </Pressable>
                  ) : null}
                  {item.website ? (
                    <Pressable
                      onPress={() => {
                        const website = item.website!.startsWith('http') ? item.website! : `https://${item.website!}`;
                        Linking.openURL(website);
                      }}
                      style={[styles.actionBtn, { borderColor: tokens.warning + '70' }]}
                    >
                      <Ionicons name="globe-outline" size={14} color={tokens.warning} />
                      <Text style={[styles.actionBtnText, { color: tokens.warning }]}>Sito</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Ticket row */}
                <View style={[styles.ticketDivider, { borderColor: tokens.glassBorder }]} />
                <View style={styles.ticketRow}>
                  <Pressable
                    onPress={() => handlePreventivo(item)}
                    style={[
                      styles.ticketBtn,
                      { backgroundColor: tokens.primary + '15', borderColor: tokens.primary + '40' },
                    ]}
                  >
                    <Ionicons name="document-text-outline" size={14} color={tokens.primary} />
                    <Text style={[styles.ticketBtnText, { color: tokens.primary }]}>
                      Richiedi preventivo
                    </Text>
                  </Pressable>

                  {lastDiagnosis && (
                    <Pressable
                      onPress={() => handleSendReport(item)}
                      style={[
                        styles.ticketBtn,
                        { backgroundColor: tokens.accent + '15', borderColor: tokens.accent + '40' },
                      ]}
                    >
                      <Ionicons name="share-outline" size={14} color={tokens.accent} />
                      <Text style={[styles.ticketBtnText, { color: tokens.accent }]}>
                        Invia report
                      </Text>
                      <View style={[styles.proBadge, { backgroundColor: tokens.accent }]}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </GlassCard>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Preventivo modal */}
      <PreventivoModal
        visible={preventivoTarget !== null}
        onClose={() => setPreventivoTarget(null)}
        mechanic={preventivoTarget}
        message={preventivoMessage}
        tokens={tokens}
      />

      {/* Paywall modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => {
          setPaywallVisible(false);
          setPdfTarget(null);
        }}
        tokens={tokens}
        reason="pdf"
      />
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
  diagnosisBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  diagnosisBannerText: { flex: 1, gap: 2 },
  diagnosisBannerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  diagnosisBannerIssue: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
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
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  mechanicName: { fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
  badgeStack: { flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
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
  ticketDivider: { borderTopWidth: 0.5, marginTop: 12, marginBottom: 10 },
  ticketRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ticketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  ticketBtnText: { fontSize: 12, fontWeight: '700' },
  proBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginTop: -8 },
  msgPreview: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  msgText: { fontSize: 13, lineHeight: 19 },
  actionTiles: { flexDirection: 'row', gap: 10 },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  actionTileLabel: { fontSize: 12, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
