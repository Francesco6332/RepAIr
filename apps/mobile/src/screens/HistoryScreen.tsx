import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { GlassCard } from '../components/GlassCard';
import { PaywallModal } from '../components/PaywallModal';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { DiagnosisRecord, listDiagnoses } from '../services/diagnoses';
import { shareDiagnosisPdf } from '../utils/buildDiagnosisPdf';
import { getCurrentPlan } from '../services/usage';

type Props = { session: Session };

const URGENCY_COLOR: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#FB923C',
  critical: '#F87171',
};

const TYPE_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  text: 'chatbubble-outline',
  photo: 'image-outline',
  audio: 'mic-outline',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function HistoryScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);

  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listDiagnoses(session.user.id);
      setRecords(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const [sharingId, setSharingId] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const onShareItem = async (item: DiagnosisRecord) => {
    if (!item.summary || item.confidence == null) return;
    const plan = await getCurrentPlan();
    if (plan === 'free') {
      setPaywallVisible(true);
      return;
    }
    setSharingId(item.id);
    try {
      await shareDiagnosisPdf({
        vehicle: item.vehicles
          ? `${item.vehicles.make} ${item.vehicles.model} · ${item.vehicles.year}`
          : 'Unknown vehicle',
        date: new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        probableIssue: item.summary,
        confidence: item.confidence,
        urgency: item.urgency ?? 'low',
        costMin: item.cost_min ?? 0,
        costMax: item.cost_max ?? 0,
        safetyAdvice: '',
      });
    } finally {
      setSharingId(null);
    }
  };

  const renderItem = ({ item }: { item: DiagnosisRecord }) => {
    const urgencyColor = item.urgency
      ? (URGENCY_COLOR[item.urgency] ?? tokens.warning)
      : tokens.textMuted;
    const typeIcon = TYPE_ICON[item.type] ?? 'help-outline';
    const vehicle = item.vehicles;

    return (
      <GlassCard backgroundColor={tokens.glass} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: tokens.primaryGlow }]}>
            <Ionicons name={typeIcon} size={15} color={tokens.primary} />
          </View>
          <Text style={[styles.summary, { color: tokens.text }]} numberOfLines={2}>
            {item.summary ?? 'Unknown issue'}
          </Text>
          <Text style={[styles.time, { color: tokens.textMuted }]}>
            {timeAgo(item.created_at)}
          </Text>
        </View>

        {vehicle && (
          <Text style={[styles.vehicleName, { color: tokens.textMuted }]}>
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </Text>
        )}

        <View style={styles.cardFooter}>
          {item.urgency && (
            <View style={[styles.badge, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor + '50' }]}>
              <Text style={[styles.badgeText, { color: urgencyColor }]}>
                {item.urgency}
              </Text>
            </View>
          )}
          {item.cost_min != null && item.cost_max != null && (
            <View style={[styles.badge, { backgroundColor: tokens.accent + '15', borderColor: tokens.accent + '40' }]}>
              <Text style={[styles.badgeText, { color: tokens.accent }]}>
                €{item.cost_min}–€{item.cost_max}
              </Text>
            </View>
          )}
          <View style={styles.spacer} />
          <View style={[
            styles.badge,
            {
              backgroundColor: item.status === 'resolved' ? '#34D39920' : 'rgba(255,255,255,0.05)',
              borderColor: item.status === 'resolved' ? '#34D39950' : 'rgba(255,255,255,0.10)',
            },
          ]}>
            <Text style={[styles.badgeText, { color: item.status === 'resolved' ? '#34D399' : tokens.textMuted }]}>
              {item.status}
            </Text>
          </View>
          <Pressable
            onPress={() => onShareItem(item)}
            disabled={sharingId === item.id}
            style={[styles.shareBtn, { borderColor: tokens.primary + '50', backgroundColor: tokens.primaryGlow }]}
          >
            <Ionicons
              name={sharingId === item.id ? 'hourglass-outline' : 'share-outline'}
              size={13}
              color={tokens.primary}
            />
            <Text style={[styles.shareBtnText, { color: tokens.primary }]}>
              {sharingId === item.id ? 'Generating…' : 'PDF'}
            </Text>
          </Pressable>
        </View>
      </GlassCard>
    );
  };

  return (
    <Gradient
      colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]}
      style={[styles.page, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.pageTitle, { color: tokens.text }]}>History</Text>
      <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>Past diagnoses</Text>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        tokens={tokens}
        reason="pdf"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={tokens.textMuted} />
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>No diagnoses yet</Text>
              <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>
                Your diagnosis history will appear here
              </Text>
            </View>
          }
        />
      )}
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginHorizontal: 18 },
  pageSubtitle: { fontSize: 14, marginBottom: 16, marginHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 18, gap: 10, paddingTop: 4 },
  card: { marginBottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summary: { fontSize: 14, fontWeight: '700', flex: 1, lineHeight: 20 },
  time: { fontSize: 11, fontWeight: '500', flexShrink: 0 },
  vehicleName: { fontSize: 12, fontWeight: '500', marginBottom: 10, marginLeft: 40 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  spacer: { flex: 1 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  shareBtnText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
});
