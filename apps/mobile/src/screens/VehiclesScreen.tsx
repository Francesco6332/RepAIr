import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { themes, ThemeTokens } from '../theme/tokens';
import { addVehicle, listVehicles } from '../services/vehicles';
import { useVehicleStore } from '../store/useVehicleStore';
import { listDiagnosesByVehicle, DiagnosisRecord } from '../services/diagnoses';
import { computeHealthScore, HealthScore } from '../utils/healthScore';
import { HealthScoreWidget } from '../components/HealthScoreWidget';
import { MaintenanceEntry, MaintenanceType, addMaintenanceEntry, listMaintenanceByVehicle } from '../services/maintenanceLog';
import { Reminder, ReminderType, addReminder, completeReminder, daysUntil, listRemindersByVehicle } from '../services/reminders';
import { useI18n } from '../i18n';

type Props = { session: Session };

// ─── Timeline helpers ─────────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'diagnosis'; date: string; record: DiagnosisRecord }
  | { kind: 'maintenance'; date: string; entry: MaintenanceEntry };

function buildTimeline(diagnoses: DiagnosisRecord[], maintenance: MaintenanceEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...diagnoses.map((d) => ({ kind: 'diagnosis' as const, date: d.created_at, record: d })),
    ...maintenance.map((m) => ({ kind: 'maintenance' as const, date: m.date + 'T00:00:00', entry: m })),
  ];
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
}


const URGENCY_COLOR: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#FB923C',
};

const MAINTENANCE_ICONS: Record<MaintenanceType, React.ComponentProps<typeof Ionicons>['name']> = {
  service: 'construct-outline',
  repair: 'hammer-outline',
  inspection: 'search-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const MAINTENANCE_TYPE_KEYS: MaintenanceType[] = ['service', 'repair', 'inspection', 'other'];
const REMINDER_TYPE_ICONS: Record<ReminderType, React.ComponentProps<typeof Ionicons>['name']> = {
  revision: 'car-outline',
  insurance: 'shield-outline',
  tax: 'receipt-outline',
  service: 'construct-outline',
  custom: 'calendar-outline',
};
const REMINDER_TYPE_KEYS: ReminderType[] = ['revision', 'insurance', 'tax', 'service', 'custom'];

const FUEL_ICONS: Record<string, string> = {
  petrol: 'flame',
  diesel: 'water',
  hybrid: 'leaf',
  electric: 'flash',
  lpg: 'flame',
  cng: 'flame',
};

// ─── Add Maintenance Modal ────────────────────────────────────────────────────

function AddMaintenanceModal({ visible, onClose, onSave, tokens }: { visible: boolean; onClose: () => void; onSave: (data: { type: MaintenanceType; description: string; cost?: number; workshopName?: string }) => void; tokens: ThemeTokens }) {
  const { t } = useI18n();
  const [type, setType] = useState<MaintenanceType>('service');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setType('service'); setDescription(''); setCost(''); setWorkshop(''); };

  const onSubmit = async () => {
    if (!description.trim()) return;
    setSaving(true);
    onSave({ type, description: description.trim(), cost: cost ? Number(cost) : undefined, workshopName: workshop.trim() || undefined });
    reset();
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: tokens.bgAlt, borderColor: tokens.glassBorder }]}>
          <View style={modalStyles.handle} />
          <Text style={[modalStyles.title, { color: tokens.text }]}>{t('garage.addMaint.title')}</Text>

          <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addMaint.type')}</Text>
          <View style={modalStyles.typeRow}>
            {MAINTENANCE_TYPE_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setType(key)}
                style={[modalStyles.typeChip, {
                  borderColor: type === key ? tokens.primary + '80' : tokens.glassBorder,
                  backgroundColor: type === key ? tokens.primaryGlow : 'rgba(255,255,255,0.04)',
                }]}
              >
                <Text style={[modalStyles.typeChipText, { color: type === key ? tokens.primary : tokens.textMuted }]}>
                  {key === 'inspection' ? t('garage.maintenance.inspectionOption') : t(`garage.maintenance.${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addMaint.description')}</Text>
          <TextInput
            style={[modalStyles.input, { color: tokens.text, borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('garage.addMaint.descriptionPlaceholder')}
            placeholderTextColor={tokens.textMuted}
          />

          <View style={modalStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addMaint.cost')}</Text>
              <TextInput
                style={[modalStyles.input, { color: tokens.text, borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                value={cost}
                onChangeText={setCost}
                placeholder="350"
                keyboardType="number-pad"
                placeholderTextColor={tokens.textMuted}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addMaint.workshop')}</Text>
              <TextInput
                style={[modalStyles.input, { color: tokens.text, borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                value={workshop}
                onChangeText={setWorkshop}
                placeholder={t('garage.addMaint.workshopPlaceholder')}
                placeholderTextColor={tokens.textMuted}
              />
            </View>
          </View>

          <PrimaryButton label={saving ? t('garage.addMaint.saving') : t('garage.addMaint.save')} onPress={onSubmit} color={tokens.primary} disabled={saving || !description.trim()} />
          <Pressable onPress={onClose} style={modalStyles.cancelBtn}>
            <Text style={[modalStyles.cancelText, { color: tokens.textMuted }]}>{t('garage.addMaint.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Add Reminder Modal ───────────────────────────────────────────────────────

function AddReminderModal({ visible, onClose, onSave, tokens }: { visible: boolean; onClose: () => void; onSave: (data: { type: ReminderType; title: string; dueDate: string }) => void; tokens: ThemeTokens }) {
  const { t } = useI18n();
  const [type, setType] = useState<ReminderType>('revision');
  const [customTitle, setCustomTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedTypeLabel = t(`garage.reminder.${type}`);
  const title = type === 'custom' ? customTitle : selectedTypeLabel;

  const reset = () => { setType('revision'); setCustomTitle(''); setDueDate(''); };

  const onSubmit = () => {
    if (!dueDate.trim() || !title) return;
    setSaving(true);
    onSave({ type, title, dueDate });
    reset();
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: tokens.bgAlt, borderColor: tokens.glassBorder }]}>
          <View style={modalStyles.handle} />
          <Text style={[modalStyles.title, { color: tokens.text }]}>{t('garage.addReminder.title')}</Text>

          <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addReminder.type')}</Text>
          <View style={modalStyles.typeRow}>
            {REMINDER_TYPE_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setType(key)}
                style={[modalStyles.typeChip, {
                  borderColor: type === key ? tokens.accent + '80' : tokens.glassBorder,
                  backgroundColor: type === key ? tokens.accent + '18' : 'rgba(255,255,255,0.04)',
                }]}
              >
                <Ionicons name={REMINDER_TYPE_ICONS[key]} size={12} color={type === key ? tokens.accent : tokens.textMuted} />
                <Text style={[modalStyles.typeChipText, { color: type === key ? tokens.accent : tokens.textMuted }]}>{t(`garage.reminder.${key}`)}</Text>
              </Pressable>
            ))}
          </View>

          {type === 'custom' && (
            <>
              <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addReminder.customTitle')}</Text>
              <TextInput
                style={[modalStyles.input, { color: tokens.text, borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder={t('garage.addReminder.customPlaceholder')}
                placeholderTextColor={tokens.textMuted}
              />
            </>
          )}

          <Text style={[modalStyles.label, { color: tokens.textMuted }]}>{t('garage.addReminder.dueDate')}</Text>
          <TextInput
            style={[modalStyles.input, { color: tokens.text, borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="2026-06-15"
            placeholderTextColor={tokens.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <PrimaryButton label={saving ? t('garage.addReminder.saving') : t('garage.addReminder.save')} onPress={onSubmit} color={tokens.accent} disabled={saving || !dueDate.trim() || !title} />
          <Pressable onPress={onClose} style={modalStyles.cancelBtn}>
            <Text style={[modalStyles.cancelText, { color: tokens.textMuted }]}>{t('garage.addReminder.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Vehicle Detail Section ───────────────────────────────────────────────────

function VehicleDetailSection({ vehicleId, userId, tokens }: { vehicleId: string; userId: string; tokens: ThemeTokens }) {
  const { t, formatDate: fmt } = useI18n();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [addMaintModal, setAddMaintModal] = useState(false);
  const [addReminderModal, setAddReminderModal] = useState(false);

  const load = useCallback(async () => {
    setLoadingData(true);
    try {
      const [diagnoses, maintenance, remindersList] = await Promise.all([
        listDiagnosesByVehicle(vehicleId),
        listMaintenanceByVehicle(vehicleId),
        listRemindersByVehicle(vehicleId),
      ]);
      setTimeline(buildTimeline(diagnoses, maintenance));
      setReminders(remindersList);
    } finally {
      setLoadingData(false);
    }
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const onSaveMaintenance = async (data: { type: MaintenanceType; description: string; cost?: number; workshopName?: string }) => {
    await addMaintenanceEntry({
      vehicleId,
      userId,
      type: data.type,
      description: data.description,
      date: new Date().toISOString().slice(0, 10),
      cost: data.cost,
      workshopName: data.workshopName,
    });
    setAddMaintModal(false);
    await load();
  };

  const onSaveReminder = async (data: { type: ReminderType; title: string; dueDate: string }) => {
    await addReminder({ vehicleId, userId, type: data.type, title: data.title, dueDate: data.dueDate });
    setAddReminderModal(false);
    await load();
  };

  const onCompleteReminder = async (reminderId: string) => {
    await completeReminder(reminderId);
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
  };

  if (loadingData) {
    return (
      <View style={detailStyles.loadingRow}>
        <ActivityIndicator size="small" color={tokens.primary} />
      </View>
    );
  }

  return (
    <View style={detailStyles.container}>
      {/* ── Promemoria ── */}
      <View style={detailStyles.sectionHeader}>
        <Text style={[detailStyles.sectionTitle, { color: tokens.text }]}>{t('garage.reminders')}</Text>
        <Pressable
          onPress={() => setAddReminderModal(true)}
          style={[detailStyles.addBtn, { borderColor: tokens.accent + '60', backgroundColor: tokens.accent + '15' }]}
        >
          <Ionicons name="add" size={14} color={tokens.accent} />
          <Text style={[detailStyles.addBtnText, { color: tokens.accent }]}>{t('garage.add')}</Text>
        </Pressable>
      </View>

      {reminders.length === 0 ? (
        <View style={[detailStyles.emptyBox, { borderColor: tokens.glassBorder }]}>
          <Ionicons name="notifications-outline" size={20} color={tokens.textMuted} />
          <Text style={[detailStyles.emptyText, { color: tokens.textMuted }]}>{t('garage.noReminders')}</Text>
        </View>
      ) : (
        <View style={detailStyles.reminderList}>
          {reminders.map((r) => {
            const days = daysUntil(r.due_date);
            const urgent = days <= 14;
            const overdue = days < 0;
            const color = overdue ? '#F87171' : urgent ? '#FBBF24' : tokens.textMuted;
            const typeInfo = REMINDER_TYPE_OPTIONS.find((o) => o.key === r.type);
            return (
              <View
                key={r.id}
                style={[
                  detailStyles.reminderRow,
                  { borderColor: overdue ? '#F8717130' : urgent ? '#FBBF2430' : tokens.glassBorder, backgroundColor: overdue ? 'rgba(248,113,113,0.06)' : urgent ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)' },
                ]}
              >
                <View style={[detailStyles.reminderIcon, { backgroundColor: color + '20' }]}>
                  <Ionicons name={typeInfo?.icon ?? 'calendar-outline'} size={14} color={color} />
                </View>
                <View style={detailStyles.reminderBody}>
                  <Text style={[detailStyles.reminderTitle, { color: tokens.text }]}>{r.title}</Text>
                  <Text style={[detailStyles.reminderDate, { color }]}>
                    {overdue ? t('garage.overdue', { n: Math.abs(days) }) : days === 0 ? t('garage.dueToday') : t('garage.dueIn', { n: days })}
                    {' · '}{fmt(r.due_date)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onCompleteReminder(r.id)}
                  style={[detailStyles.checkBtn, { borderColor: tokens.glassBorder }]}
                >
                  <Ionicons name="checkmark" size={14} color={tokens.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Timeline ── */}
      <View style={[detailStyles.sectionHeader, { marginTop: 20 }]}>
        <Text style={[detailStyles.sectionTitle, { color: tokens.text }]}>{t('garage.timeline')}</Text>
        <Pressable
          onPress={() => setAddMaintModal(true)}
          style={[detailStyles.addBtn, { borderColor: tokens.primary + '60', backgroundColor: tokens.primaryGlow }]}
        >
          <Ionicons name="add" size={14} color={tokens.primary} />
          <Text style={[detailStyles.addBtnText, { color: tokens.primary }]}>{t('garage.addMaintenance')}</Text>
        </Pressable>
      </View>

      {timeline.length === 0 ? (
        <View style={[detailStyles.emptyBox, { borderColor: tokens.glassBorder }]}>
          <Ionicons name="time-outline" size={20} color={tokens.textMuted} />
          <Text style={[detailStyles.emptyText, { color: tokens.textMuted }]}>{t('garage.noEvents')}</Text>
        </View>
      ) : (
        <View style={detailStyles.timelineList}>
          {timeline.map((event, idx) => {
            const isLast = idx === timeline.length - 1;
            if (event.kind === 'diagnosis') {
              const urgencyColor = URGENCY_COLOR[event.record.urgency ?? 'low'] ?? tokens.textMuted;
              return (
                <View key={event.record.id} style={detailStyles.timelineRow}>
                  <View style={detailStyles.timelineLeft}>
                    <View style={[detailStyles.dot, { backgroundColor: urgencyColor }]} />
                    {!isLast && <View style={[detailStyles.line, { backgroundColor: tokens.glassBorder }]} />}
                  </View>
                  <View style={[detailStyles.timelineCard, { borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <View style={detailStyles.timelineCardHeader}>
                      <View style={[detailStyles.timelineIcon, { backgroundColor: urgencyColor + '20' }]}>
                        <Ionicons name="construct-outline" size={12} color={urgencyColor} />
                      </View>
                      <Text style={[detailStyles.timelineType, { color: tokens.textMuted }]}>{t('garage.diagnosisLabel')}</Text>
                      <Text style={[detailStyles.timelineDate, { color: tokens.textMuted }]}>{fmt(event.date)}</Text>
                    </View>
                    <Text style={[detailStyles.timelineTitle, { color: tokens.text }]} numberOfLines={2}>
                      {event.record.summary ?? t('garage.diagnosisLabel')}
                    </Text>
                    {event.record.cost_min != null && (
                      <Text style={[detailStyles.timelineMeta, { color: tokens.textMuted }]}>
                        €{event.record.cost_min}–€{event.record.cost_max} · {event.record.urgency}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }

            // maintenance
            const mIcon = MAINTENANCE_ICONS[event.entry.type];
            const mLabel = t(`garage.maintenance.${event.entry.type}`);
            return (
              <View key={event.entry.id} style={detailStyles.timelineRow}>
                <View style={detailStyles.timelineLeft}>
                  <View style={[detailStyles.dot, { backgroundColor: '#34D399' }]} />
                  {!isLast && <View style={[detailStyles.line, { backgroundColor: tokens.glassBorder }]} />}
                </View>
                <View style={[detailStyles.timelineCard, { borderColor: tokens.glassBorder, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                  <View style={detailStyles.timelineCardHeader}>
                    <View style={[detailStyles.timelineIcon, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                      <Ionicons name={mIcon} size={12} color="#34D399" />
                    </View>
                    <Text style={[detailStyles.timelineType, { color: tokens.textMuted }]}>{mLabel}</Text>
                    <Text style={[detailStyles.timelineDate, { color: tokens.textMuted }]}>{fmt(event.date)}</Text>
                  </View>
                  <Text style={[detailStyles.timelineTitle, { color: tokens.text }]} numberOfLines={2}>
                    {event.entry.description}
                  </Text>
                  <Text style={[detailStyles.timelineMeta, { color: tokens.textMuted }]}>
                    {event.entry.cost != null ? `€${event.entry.cost}` : ''}
                    {event.entry.workshop_name ? (event.entry.cost != null ? ` · ${event.entry.workshop_name}` : event.entry.workshop_name) : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <AddMaintenanceModal visible={addMaintModal} onClose={() => setAddMaintModal(false)} onSave={onSaveMaintenance} tokens={tokens} />
      <AddReminderModal visible={addReminderModal} onClose={() => setAddReminderModal(false)} onSave={onSaveReminder} tokens={tokens} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function VehiclesScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t } = useI18n();
  const { vehicles, selectedVehicleId, setSelectedVehicleId, setVehicles } = useVehicleStore();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [healthScores, setHealthScores] = useState<Record<string, HealthScore>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    const data = await listVehicles(session.user.id);
    setVehicles(data);
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
    if (!make || !model || !year) { setError(t('vehicles.required')); return; }
    setAdding(true);
    try {
      Keyboard.dismiss();
      await addVehicle({ userId: session.user.id, make: make.trim(), model: model.trim(), year: Number(year), mileage: mileage ? Number(mileage) : 0, fuelType: 'petrol' });
      setMake(''); setModel(''); setYear(''); setMileage('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setExpandedId((prev) => (prev === vehicleId ? null : vehicleId));
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <Gradient colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]} style={[styles.page, { paddingTop: insets.top + 16 }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.pageTitle, { color: tokens.text }]}>{t('vehicles.title')}</Text>
          <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
            {t('vehicles.registered', { n: vehicles.length })}
          </Text>

          {/* Add vehicle card */}
          <GlassCard backgroundColor={tokens.glass} style={styles.card}>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('vehicles.addVehicle')}</Text>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <GlassInput tokens={tokens} label={t('vehicles.make')} value={make} onChangeText={setMake} placeholder="es. Ford" returnKeyType="next" autoCapitalize="words" />
              </View>
              <View style={styles.halfInput}>
                <GlassInput tokens={tokens} label={t('vehicles.model')} value={model} onChangeText={setModel} placeholder="es. Focus" returnKeyType="next" autoCapitalize="words" />
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <GlassInput tokens={tokens} label={t('vehicles.year')} value={year} onChangeText={setYear} placeholder="2020" keyboardType="number-pad" returnKeyType="next" />
              </View>
              <View style={styles.halfInput}>
                <GlassInput tokens={tokens} label={t('vehicles.km')} value={mileage} onChangeText={setMileage} placeholder="50000" keyboardType="number-pad" returnKeyType="done" onSubmitEditing={onAdd} />
              </View>
            </View>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: tokens.danger + '18', borderColor: tokens.danger + '40' }]}>
                <Ionicons name="alert-circle-outline" size={14} color={tokens.danger} />
                <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text>
              </View>
            ) : null}
            <PrimaryButton label={adding ? t('vehicles.adding') : t('vehicles.addCta')} onPress={onAdd} color={tokens.primary} disabled={adding} />
          </GlassCard>

          {/* Vehicle list */}
          {vehicles.length > 0 ? (
            <View style={styles.listContainer}>
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('vehicles.yourVehicles')}</Text>
              {vehicles.map((item) => {
                const selected = selectedVehicleId === item.id;
                const expanded = expandedId === item.id;
                const fuelIcon = (FUEL_ICONS[item.fuel_type ?? 'petrol'] ?? 'flame') as any;
                return (
                  <View key={item.id}>
                    <Pressable onPress={() => onSelectVehicle(item.id)}>
                      <GlassCard backgroundColor={selected ? tokens.primaryGlow : tokens.glass}>
                        <View style={styles.vehicleRow}>
                          <View style={[styles.vehicleIconBg, { backgroundColor: selected ? tokens.primary + '25' : 'rgba(255,255,255,0.07)' }]}>
                            <Ionicons name="car-sport" size={22} color={selected ? tokens.primary : tokens.textMuted} />
                          </View>
                          <View style={styles.vehicleInfo}>
                            <Text style={[styles.vehicleName, { color: tokens.text }]}>{item.make} {item.model}</Text>
                            <Text style={[styles.vehicleMeta, { color: tokens.textMuted }]}>{item.year} · {(item.current_mileage ?? 0).toLocaleString()} km</Text>
                          </View>
                          <View style={styles.vehicleRight}>
                            {selected ? (
                              <View style={[styles.activePill, { backgroundColor: tokens.primary + '22', borderColor: tokens.primary + '60' }]}>
                                <Ionicons name="checkmark-circle" size={12} color={tokens.primary} />
                                <Text style={[styles.activePillText, { color: tokens.primary }]}>{t('vehicles.active')}</Text>
                              </View>
                            ) : null}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name={fuelIcon} size={14} color={tokens.textMuted} />
                              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={tokens.textMuted} />
                            </View>
                          </View>
                        </View>
                        {healthScores[item.id] && (
                          <HealthScoreWidget health={healthScores[item.id]} textColor={tokens.textMuted} trackColor={tokens.glassBorder} />
                        )}
                      </GlassCard>
                    </Pressable>

                    {/* Expanded detail: timeline + reminders */}
                    {expanded && (
                      <GlassCard backgroundColor={tokens.glass} style={{ marginTop: 2 }}>
                        <VehicleDetailSection vehicleId={item.id} userId={session.user.id} tokens={tokens} />
                      </GlassCard>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </Gradient>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },
  pageTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginBottom: 2 },
  card: { marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 0.5, marginBottom: 10 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  listContainer: { gap: 4 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIconBg: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '700' },
  vehicleMeta: { fontSize: 13, marginTop: 2 },
  vehicleRight: { alignItems: 'flex-end', gap: 4 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 },
  activePillText: { fontSize: 11, fontWeight: '700' },
});

const detailStyles = StyleSheet.create({
  container: { paddingTop: 4 },
  loadingRow: { paddingVertical: 20, alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 0.5 },
  addBtnText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 0.5, borderStyle: 'dashed' },
  emptyText: { fontSize: 13 },

  // Reminders
  reminderList: { gap: 8 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 0.5 },
  reminderIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 13, fontWeight: '600' },
  reminderDate: { fontSize: 11, marginTop: 2 },
  checkBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },

  // Timeline
  timelineList: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 10 },
  line: { width: 1, flex: 1, marginTop: 4, marginBottom: 4 },
  timelineCard: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 0.5, marginBottom: 8 },
  timelineCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  timelineIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  timelineType: { fontSize: 11, fontWeight: '600', flex: 1 },
  timelineDate: { fontSize: 11 },
  timelineTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  timelineMeta: { fontSize: 11, marginTop: 3 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0.5, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { borderWidth: 0.5, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 14 },
  row: { flexDirection: 'row' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5 },
  typeChipText: { fontSize: 12, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 13, fontWeight: '600' },
});
