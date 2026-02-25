import React, { useMemo, useState } from 'react';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { PaywallModal } from '../components/PaywallModal';
import { analyzeAudio, analyzePhoto, createPrediagnosis, lookupDtc, sendFollowUp } from '../services/api';
import { saveDiagnosis } from '../services/diagnoses';
import { shareDiagnosisPdf } from '../utils/buildDiagnosisPdf';
import { scheduleLocalDiagnosisAlert } from '../services/notifications';
import { getCurrentPlan } from '../services/usage';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { ChatMessage, PrediagnosisResult } from '@repairo/shared';
import { useVehicleStore } from '../store/useVehicleStore';
import { useI18n } from '../i18n';

type Props = { session: Session };

// ─── Wizard types ─────────────────────────────────────────────────────────────

type ProblemType = 'spia' | 'rumore' | 'vibrazione' | 'perdita' | 'avvio' | 'altro';
type WizardTiming = 'ora' | 'giorni' | 'settimane';
type WizardCondition = 'sempre' | 'accelerazione' | 'frenata' | 'caldo' | 'minimo';

interface WizardOption<T> {
  key: T;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const PROBLEM_TYPES: WizardOption<ProblemType>[] = [
  { key: 'spia', label: 'Spia accesa', icon: 'warning-outline' },
  { key: 'rumore', label: 'Rumore', icon: 'volume-high-outline' },
  { key: 'vibrazione', label: 'Vibrazione', icon: 'pulse-outline' },
  { key: 'perdita', label: 'Perdita', icon: 'water-outline' },
  { key: 'avvio', label: 'Avvio', icon: 'power-outline' },
  { key: 'altro', label: 'Altro', icon: 'ellipsis-horizontal-outline' },
];

const TIMINGS: WizardOption<WizardTiming>[] = [
  { key: 'ora', label: 'Appena ora', icon: 'time-outline' },
  { key: 'giorni', label: 'Ultimi giorni', icon: 'calendar-outline' },
  { key: 'settimane', label: 'Da settimane', icon: 'calendar-number-outline' },
];

const CONDITIONS: WizardOption<WizardCondition>[] = [
  { key: 'sempre', label: 'Sempre', icon: 'infinite-outline' },
  { key: 'accelerazione', label: 'Accelerando', icon: 'speedometer-outline' },
  { key: 'frenata', label: 'Frenando', icon: 'stop-circle-outline' },
  { key: 'caldo', label: 'A caldo', icon: 'thermometer-outline' },
  { key: 'minimo', label: 'Al minimo', icon: 'car-outline' },
];

// Problem types that benefit from media proof
const NEEDS_AUDIO: ProblemType[] = ['rumore', 'vibrazione', 'avvio'];
const NEEDS_PHOTO: ProblemType[] = ['spia', 'perdita'];

function buildWizardPrompt(
  problemType: ProblemType | null,
  timing: WizardTiming | null,
  condition: WizardCondition | null,
  extraText: string
): string {
  const parts: string[] = [];
  if (problemType && problemType !== 'altro') {
    const labels: Record<ProblemType, string> = {
      spia: 'spia di avvertimento accesa sul cruscotto',
      rumore: 'rumore anomalo',
      vibrazione: 'vibrazione anomala',
      perdita: 'perdita di liquidi',
      avvio: 'difficoltà ad avviare il motore',
      altro: '',
    };
    parts.push(labels[problemType]);
  }
  if (timing) {
    const t: Record<WizardTiming, string> = { ora: 'appena ora', giorni: 'negli ultimi giorni', settimane: 'da settimane' };
    parts.push(`da ${t[timing]}`);
  }
  if (condition) {
    const c: Record<WizardCondition, string> = {
      sempre: 'si manifesta sempre',
      accelerazione: 'si manifesta principalmente in accelerazione',
      frenata: 'si manifesta principalmente in frenata',
      caldo: 'si manifesta quando il motore è a temperatura',
      minimo: 'si manifesta al minimo',
    };
    parts.push(c[condition]);
  }
  const base = parts.join(', ');
  if (extraText.trim()) return base ? `${base}. ${extraText.trim()}` : extraText.trim();
  return base;
}

// ─── Urgency / UI constants ───────────────────────────────────────────────────

const URGENCY_COLOR: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#FB923C',
  critical: '#F87171',
};

const CAN_DRIVE_VISUAL = {
  yes: { color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', icon: 'checkmark-circle' as const },
  with_caution: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', icon: 'warning' as const },
  no: { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', icon: 'close-circle' as const },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DiagnoseScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t, formatDate, language } = useI18n();
  const appLanguage: 'it' | 'en' = language === 'it' ? 'it' : 'en';
  const { vehicles, selectedVehicleId, setLastDiagnosis } = useVehicleStore();

  // Wizard state
  const [problemType, setProblemType] = useState<ProblemType | null>(null);
  const [timing, setTiming] = useState<WizardTiming | null>(null);
  const [condition, setCondition] = useState<WizardCondition | null>(null);
  const [extraText, setExtraText] = useState('');

  // Core diagnosis state
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioStartedAt, setAudioStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<PrediagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dtcVisible, setDtcVisible] = useState(false);
  const [dtcCode, setDtcCode] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  const vehicleContext = selectedVehicle
    ? { make: selectedVehicle.make, model: selectedVehicle.model, year: selectedVehicle.year, mileage: selectedVehicle.current_mileage, fuelType: selectedVehicle.fuel_type ?? undefined }
    : null;

  const finalPrompt = buildWizardPrompt(problemType, timing, condition, extraText);
  const mediaSuggestion = problemType
    ? NEEDS_AUDIO.includes(problemType) ? 'audio'
    : NEEDS_PHOTO.includes(problemType) ? 'photo'
    : null
    : null;

  // ─── Diagnosis handlers ─────────────────────────────────────────────────────

  const withGuard = async (fn: () => Promise<PrediagnosisResult>, type: 'text' | 'photo' | 'audio', userContent: string) => {
    if (!vehicleContext) { setError(t('diagnose.noVehicleError')); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);
    try {
      const data = await fn();
      setResult(data);
      setLastDiagnosis(data);
      setConversationHistory([
        { role: 'user', content: userContent },
        {
          role: 'assistant',
          content: `${data.probableIssue}. ${appLanguage === 'it' ? 'Confidenza' : 'Confidence'}: ${Math.round(data.confidence * 100)}%. ${data.safetyAdvice}`,
        },
      ]);
      scheduleLocalDiagnosisAlert(data.urgency, data.probableIssue).catch(() => {});
      if (selectedVehicle) {
        saveDiagnosis({ userId: session.user.id, vehicleId: selectedVehicle.id, type, result: data }).catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onDiagnoseText = async () => {
    Keyboard.dismiss();
    const prompt = finalPrompt;
    if (!prompt.trim()) { setError(t('diagnose.emptyPromptError')); return; }
    await withGuard(
      async () => createPrediagnosis({ mode: 'text', prompt, region: appLanguage, language: appLanguage, vehicle: vehicleContext! }),
      'text',
      prompt
    );
  };

  const onAnalyzePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(t('diagnose.photoPermission')); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.base64) { setError(t('diagnose.photoReadError')); return; }
    await withGuard(
      async () => analyzePhoto({ imageBase64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg', region: appLanguage, language: appLanguage, vehicle: vehicleContext! }),
      'photo', appLanguage === 'it' ? 'Analisi foto problema visibile' : 'Photo analysis of visible issue'
    );
  };

  const onToggleAudio = async () => {
    if (!recording) {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { setError(t('diagnose.micPermission')); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setAudioStartedAt(Date.now());
      return;
    }
    await recording.stopAndUnloadAsync();
    const seconds = audioStartedAt ? Math.round((Date.now() - audioStartedAt) / 1000) : 10;
    setRecording(null);
    setAudioStartedAt(null);
    const contextPrefix = appLanguage === 'it' ? 'Contesto' : 'Context';
    const transcriptLine = appLanguage === 'it'
      ? `Il conducente ha registrato un rumore meccanico anomalo per circa ${seconds} secondi.`
      : `The driver recorded an abnormal mechanical noise for about ${seconds} seconds.`;
    const context = finalPrompt ? `${contextPrefix}: ${finalPrompt}. ` : '';
    await withGuard(
      async () => analyzeAudio({ audioTranscript: `${context}${transcriptLine}`, region: appLanguage, language: appLanguage, vehicle: vehicleContext! }),
      'audio', `${appLanguage === 'it' ? 'Registrazione audio' : 'Audio recording'} (${seconds}s)${finalPrompt ? ` — ${finalPrompt}` : ''}`
    );
  };

  const onLookupDtc = async () => {
    Keyboard.dismiss();
    if (!dtcCode.trim()) { setError(t('diagnose.dtcError')); return; }
    await withGuard(
      async () => lookupDtc({ code: dtcCode.trim(), region: appLanguage, language: appLanguage, vehicle: vehicleContext! }),
      'text', `${appLanguage === 'it' ? 'Codice OBD-II' : 'OBD-II code'}: ${dtcCode.trim()}`
    );
  };

  const onSendFollowUp = async () => {
    const text = followUpText.trim();
    if (!text || !vehicleContext) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...conversationHistory, userMsg];
    setConversationHistory(newHistory);
    setChatMessages((prev) => [...prev, userMsg]);
    setFollowUpText('');
    setChatLoading(true);
    try {
      const response = await sendFollowUp({ messages: newHistory, vehicle: vehicleContext, region: appLanguage, language: appLanguage });
      const aiMsg: ChatMessage = { role: 'assistant', content: response.message };
      setConversationHistory((prev) => [...prev, aiMsg]);
      setChatMessages((prev) => [...prev, aiMsg]);
      setResult(response.diagnosis);
    } catch (e) {
      setChatMessages((prev) => prev.slice(0, -1));
      setError((e as Error).message);
    } finally {
      setChatLoading(false);
    }
  };

  const onSharePdf = async () => {
    if (!result) return;
    const plan = await getCurrentPlan();
    if (plan === 'free') { setPaywallVisible(true); return; }
    setSharing(true);
    try {
      await shareDiagnosisPdf({
        vehicle: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}` : t('diagnose.unknownVehicle'),
        date: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' }),
        probableIssue: result.probableIssue,
        confidence: result.confidence,
        urgency: result.urgency,
        costMin: result.estimatedCostMin,
        costMax: result.estimatedCostMax,
        safetyAdvice: result.safetyAdvice,
        nextChecks: result.nextChecks,
        canDrive: result.canDrive,
        topCauses: result.topCauses,
        userChecks: result.userChecks,
        ignoreRisks: result.ignoreRisks,
        estimatedTimeMin: result.estimatedTimeMin,
        estimatedTimeMax: result.estimatedTimeMax,
        mechanicQuestions: result.mechanicQuestions,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const urgencyColor = result ? (URGENCY_COLOR[result.urgency.toLowerCase()] ?? tokens.warning) : tokens.warning;
  const urgencyLabel = result ? (t(`diagnose.urgency.${result.urgency.toLowerCase()}`) ?? result.urgency) : '';
  const canDriveVisual = result?.canDrive ? CAN_DRIVE_VISUAL[result.canDrive] : null;
  const canDriveLabel = result?.canDrive ? t(`diagnose.canDrive.${result.canDrive === 'with_caution' ? 'caution' : result.canDrive}.label`) : '';
  const canDriveSub = result?.canDrive ? t(`diagnose.canDrive.${result.canDrive === 'with_caution' ? 'caution' : result.canDrive}.sub`) : '';

  return (
    <Gradient colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]} style={[styles.page, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={[styles.pageTitle, { color: tokens.text }]}>{t('diagnose.title')}</Text>
        <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>{t('diagnose.subtitle')}</Text>

        {/* Vehicle chip */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>
          <View style={styles.vehicleRow}>
            <View style={[styles.vehicleIcon, { backgroundColor: tokens.primaryGlow }]}>
              <Ionicons name="car-sport" size={18} color={tokens.primary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleLabel, { color: tokens.textMuted }]}>{t('diagnose.vehicleActive')}</Text>
              <Text style={[styles.vehicleName, { color: tokens.text }]}>
                {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}` : t('diagnose.noVehicle')}
              </Text>
            </View>
            {!selectedVehicle && <Ionicons name="alert-circle-outline" size={18} color={tokens.warning} />}
          </View>
        </GlassCard>

        {/* ── WIZARD INPUT ── */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>

          {/* Step 1: Tipo di problema */}
          <Text style={[styles.wizardLabel, { color: tokens.textMuted }]}>{t('diagnose.wizard.problemLabel')}</Text>
          <View style={styles.chipGrid}>
            {PROBLEM_TYPES.map((opt) => {
              const active = problemType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setProblemType(active ? null : opt.key)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? tokens.primary + '80' : tokens.glassBorder,
                      backgroundColor: active ? tokens.primaryGlow : 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Ionicons name={opt.icon} size={13} color={active ? tokens.primary : tokens.textMuted} />
                  <Text style={[styles.chipText, { color: active ? tokens.primary : tokens.textMuted }]}>{t(`diagnose.problem.${opt.key}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Step 2: Quando + Condizione (shown after problem type selected) */}
          {problemType && (
            <>
              <View style={[styles.wizardDivider, { backgroundColor: tokens.glassBorder }]} />
              <Text style={[styles.wizardLabel, { color: tokens.textMuted }]}>{t('diagnose.wizard.timingLabel')}</Text>
              <View style={styles.chipRow}>
                {TIMINGS.map((opt) => {
                  const active = timing === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setTiming(active ? null : opt.key)}
                      style={[
                        styles.chipFlex,
                        {
                          borderColor: active ? tokens.accent + '80' : tokens.glassBorder,
                          backgroundColor: active ? tokens.accent + '18' : 'rgba(255,255,255,0.04)',
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? tokens.accent : tokens.textMuted }]}>{t(`diagnose.timing.${opt.key}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.wizardLabel, { color: tokens.textMuted, marginTop: 12 }]}>{t('diagnose.wizard.conditionLabel')}</Text>
              <View style={styles.chipRow}>
                {CONDITIONS.map((opt) => {
                  const active = condition === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setCondition(active ? null : opt.key)}
                      style={[
                        styles.chipFlex,
                        {
                          borderColor: active ? tokens.accent + '80' : tokens.glassBorder,
                          backgroundColor: active ? tokens.accent + '18' : 'rgba(255,255,255,0.04)',
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? tokens.accent : tokens.textMuted }]}>{t(`diagnose.condition.${opt.key}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Step 3: Dettagli aggiuntivi */}
          <View style={[styles.wizardDivider, { backgroundColor: tokens.glassBorder, marginTop: problemType ? 12 : 0 }]} />
          <GlassInput
            tokens={tokens}
            label={t('diagnose.wizard.detailsLabel')}
            value={extraText}
            onChangeText={setExtraText}
            placeholder={t('diagnose.wizard.detailsPlaceholder')}
            multiline
            style={styles.textArea}
            textAlignVertical="top"
          />

          {/* Media suggestion based on problem type */}
          {mediaSuggestion && (
            <View style={[styles.suggestionBox, { backgroundColor: tokens.primaryGlow, borderColor: tokens.primary + '40' }]}>
              <Ionicons name="bulb-outline" size={14} color={tokens.primary} />
              <Text style={[styles.suggestionText, { color: tokens.primary }]}>
                {mediaSuggestion === 'audio'
                  ? t('diagnose.wizard.suggestionAudio')
                  : t('diagnose.wizard.suggestionPhoto')}
              </Text>
              <Pressable
                onPress={mediaSuggestion === 'audio' ? onToggleAudio : onAnalyzePhoto}
                style={[styles.suggestionBtn, { backgroundColor: tokens.primary + '22', borderColor: tokens.primary + '50' }]}
              >
                <Ionicons name={mediaSuggestion === 'audio' ? 'mic' : 'camera'} size={13} color={tokens.primary} />
                <Text style={[styles.suggestionBtnText, { color: tokens.primary }]}>
                  {mediaSuggestion === 'audio' ? (recording ? t('diagnose.wizard.stop') : t('diagnose.wizard.record')) : t('diagnose.wizard.photo')}
                </Text>
              </Pressable>
            </View>
          )}

          <PrimaryButton
            label={finalPrompt.trim() ? 'Analizza' : 'Analizza'}
            onPress={onDiagnoseText}
            color={tokens.primary}
            disabled={loading || !finalPrompt.trim()}
          />

          {/* Secondary media buttons */}
          <View style={styles.mediaRow}>
            <Pressable onPress={onAnalyzePhoto} style={[styles.mediaBtn, { borderColor: tokens.accent + '80' }]}>
              <Ionicons name="image-outline" size={17} color={tokens.accent} />
              <Text style={[styles.mediaBtnText, { color: tokens.accent }]}>{t('diagnose.wizard.photo')}</Text>
            </Pressable>
            <Pressable
              onPress={onToggleAudio}
              style={[styles.mediaBtn, { borderColor: recording ? tokens.danger + '80' : tokens.warning + '80', backgroundColor: recording ? tokens.danger + '15' : 'transparent' }]}
            >
              <Ionicons name={recording ? 'stop-circle' : 'mic-outline'} size={17} color={recording ? tokens.danger : tokens.warning} />
              <Text style={[styles.mediaBtnText, { color: recording ? tokens.danger : tokens.warning }]}>
                {recording ? t('diagnose.wizard.stop') : t('diagnose.wizard.audio')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDtcVisible((v) => !v)}
              style={[styles.mediaBtn, { borderColor: dtcVisible ? tokens.primary + '80' : tokens.glassBorder, backgroundColor: dtcVisible ? tokens.primaryGlow : 'transparent' }]}
            >
              <Ionicons name="barcode-outline" size={17} color={dtcVisible ? tokens.primary : tokens.textMuted} />
              <Text style={[styles.mediaBtnText, { color: dtcVisible ? tokens.primary : tokens.textMuted }]}>OBD</Text>
            </Pressable>
          </View>

          {dtcVisible && (
            <View style={styles.dtcPanel}>
              <GlassInput tokens={tokens} label={t('diagnose.obd.label')} value={dtcCode} onChangeText={(v) => setDtcCode(v.toUpperCase())} placeholder="P0420" autoCapitalize="characters" maxLength={7} />
              <PrimaryButton label={t('diagnose.obd.analyze')} onPress={onLookupDtc} color={tokens.primary} disabled={loading} />
            </View>
          )}
        </GlassCard>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.primary} />
            <Text style={[styles.loadingText, { color: tokens.textMuted }]}>{t('diagnose.analyzing')}</Text>
          </View>
        )}

        {error ? (
          <View style={[styles.alertBox, { backgroundColor: tokens.danger + '18', borderColor: tokens.danger + '40' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={[styles.alertText, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* ── STRUCTURED RESULT REPORT ── */}
        {result ? (
          <>
            {canDriveVisual && (
              <View style={[styles.driveBanner, { backgroundColor: canDriveVisual.bg, borderColor: canDriveVisual.border }]}>
                <View style={[styles.driveIconWrap, { backgroundColor: canDriveVisual.color + '20' }]}>
                  <Ionicons name={canDriveVisual.icon} size={22} color={canDriveVisual.color} />
                </View>
                <View style={styles.driveText}>
                  <Text style={[styles.driveLabel, { color: canDriveVisual.color }]}>{canDriveLabel}</Text>
                  <Text style={[styles.driveSub, { color: canDriveVisual.color }]}>{canDriveSub}</Text>
                </View>
              </View>
            )}

            <GlassCard backgroundColor={tokens.glass} style={styles.card}>
              <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.mainDiagnosis')}</Text>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIcon, { backgroundColor: tokens.accent + '20' }]}>
                  <Ionicons name="construct" size={18} color={tokens.accent} />
                </View>
                <Text style={[styles.resultTitle, { color: tokens.text }]}>{result.probableIssue}</Text>
              </View>
              <View style={styles.tagsRow}>
                <View style={[styles.tag, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor + '50' }]}>
                  <Text style={[styles.tagText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: tokens.accent + '18', borderColor: tokens.accent + '40' }]}>
                  <Text style={[styles.tagText, { color: tokens.accent }]}>€{result.estimatedCostMin}–€{result.estimatedCostMax}</Text>
                </View>
                {result.estimatedTimeMin != null && result.estimatedTimeMax != null && (
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}>
                    <Text style={[styles.tagText, { color: tokens.textMuted }]}>{result.estimatedTimeMin}–{result.estimatedTimeMax}h</Text>
                  </View>
                )}
              </View>
              <View style={styles.confRow}>
                <Text style={[styles.confLabel, { color: tokens.textMuted }]}>{t('diagnose.result.aiConfidence')}</Text>
                <Text style={[styles.confValue, { color: tokens.primary }]}>{Math.round(result.confidence * 100)}%</Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: tokens.glassBorder }]}>
                <View style={[styles.barFill, { width: `${Math.round(result.confidence * 100)}%` as any, backgroundColor: tokens.primary }]} />
              </View>
            </GlassCard>

            {result.topCauses && result.topCauses.length > 0 && (
              <GlassCard backgroundColor={tokens.glass} style={styles.card}>
                <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.topCauses')}</Text>
                {result.topCauses.map((c, i) => (
                  <View key={i} style={styles.causeRow}>
                    <View style={[styles.causeNum, { backgroundColor: tokens.primaryGlow }]}>
                      <Text style={[styles.causeNumText, { color: tokens.primary }]}>{i + 1}</Text>
                    </View>
                    <View style={styles.causeBody}>
                      <Text style={[styles.causeName, { color: tokens.text }]}>{c.cause}</Text>
                      <View style={styles.causeBarRow}>
                        <View style={[styles.causeBarBg, { backgroundColor: tokens.glassBorder }]}>
                          <View style={[styles.causeBarFill, { width: `${Math.round(c.confidence * 100)}%` as any, backgroundColor: tokens.primary + 'AA' }]} />
                        </View>
                        <Text style={[styles.causePct, { color: tokens.textMuted }]}>{Math.round(c.confidence * 100)}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </GlassCard>
            )}

            {result.ignoreRisks ? (
              <View style={[styles.riskBox, { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.22)' }]}>
                <View style={styles.riskHeader}>
                  <Ionicons name="flame-outline" size={15} color="#F87171" />
                  <Text style={[styles.riskTitle, { color: '#F87171' }]}>{t('diagnose.result.ignoreRisks')}</Text>
                </View>
                <Text style={[styles.riskText, { color: tokens.textMuted }]}>{result.ignoreRisks}</Text>
              </View>
            ) : null}

            <GlassCard backgroundColor={tokens.glass} style={styles.card}>
              <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.safetyAdvice')}</Text>
              <View style={styles.adviceBox}>
                <Ionicons name="shield-checkmark-outline" size={14} color={tokens.textMuted} />
                <Text style={[styles.adviceText, { color: tokens.textMuted }]}>{result.safetyAdvice}</Text>
              </View>
            </GlassCard>

            {result.userChecks && result.userChecks.length > 0 && (
              <GlassCard backgroundColor={tokens.glass} style={styles.card}>
                <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.userChecks')}</Text>
                {result.userChecks.map((check, i) => (
                  <View key={i} style={styles.checkRow}>
                    <View style={[styles.checkDot, { backgroundColor: tokens.primary + '40' }]} />
                    <Text style={[styles.checkText, { color: tokens.text }]}>{check}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {result.nextChecks && result.nextChecks.length > 0 && (
              <GlassCard backgroundColor={tokens.glass} style={styles.card}>
                <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.mechanicChecklist')}</Text>
                {result.nextChecks.map((check, i) => (
                  <View key={i} style={styles.mechanicRow}>
                    <Text style={[styles.checkbox, { color: tokens.textMuted }]}>□</Text>
                    <Text style={[styles.checkText, { color: tokens.text }]}>{check}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {result.mechanicQuestions && result.mechanicQuestions.length > 0 && (
              <GlassCard backgroundColor={tokens.glass} style={styles.card}>
                <View style={styles.questionsHeader}>
                  <Ionicons name="help-circle-outline" size={15} color={tokens.primary} />
                  <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('diagnose.result.mechanicQuestions')}</Text>
                </View>
                {result.mechanicQuestions.map((q, i) => (
                  <View key={i} style={styles.questionRow}>
                    <Text style={[styles.questionNum, { color: tokens.primary }]}>{i + 1}.</Text>
                    <Text style={[styles.questionText, { color: tokens.text }]}>{q}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            <Pressable
              onPress={onSharePdf}
              disabled={sharing}
              style={[styles.shareBtn, { borderColor: tokens.primary + '50', backgroundColor: tokens.primaryGlow }]}
            >
              <Ionicons name={sharing ? 'hourglass-outline' : 'document-text-outline'} size={15} color={tokens.primary} />
              <Text style={[styles.shareBtnText, { color: tokens.primary }]}>
                {sharing ? t('diagnose.pdf.generating') : t('diagnose.pdf.export')}
              </Text>
              <View style={[styles.proBadge, { backgroundColor: tokens.primary + '22', borderColor: tokens.primary + '44' }]}>
                <Text style={[styles.proBadgeText, { color: tokens.primary }]}>PRO</Text>
              </View>
            </Pressable>
          </>
        ) : null}

        {/* ── FOLLOW-UP CHAT ── */}
        {result ? (
          <GlassCard backgroundColor={tokens.glass} style={styles.card}>
            <View style={styles.chatHeader}>
              <Ionicons name="chatbubbles-outline" size={15} color={tokens.primary} />
              <Text style={[styles.chatTitle, { color: tokens.text }]}>{t('diagnose.chat.title')}</Text>
            </View>
            {chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? { alignSelf: 'flex-end', backgroundColor: tokens.primary + '22', borderColor: tokens.primary + '44' }
                    : { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderColor: tokens.glassBorder },
                ]}
              >
                <Text style={[styles.bubbleText, { color: tokens.text }]}>{msg.content}</Text>
              </View>
            ))}
            {chatLoading && (
              <View style={styles.chatLoadingRow}>
                <ActivityIndicator size="small" color={tokens.primary} />
                <Text style={[styles.loadingText, { color: tokens.textMuted }]}>{t('diagnose.chat.analyzing')}</Text>
              </View>
            )}
            <View style={[styles.chatInputRow, { borderTopColor: tokens.glassBorder }]}>
              <TextInput
                style={[styles.chatInput, { color: tokens.text }]}
                value={followUpText}
                onChangeText={setFollowUpText}
                placeholder={t('diagnose.chat.placeholder')}
                placeholderTextColor={tokens.textMuted}
                onSubmitEditing={onSendFollowUp}
                returnKeyType="send"
                editable={!chatLoading}
              />
              <Pressable
                onPress={onSendFollowUp}
                disabled={chatLoading || !followUpText.trim()}
                style={[styles.sendBtn, { backgroundColor: tokens.primaryGlow }]}
              >
                <Ionicons name="send" size={16} color={chatLoading || !followUpText.trim() ? tokens.textMuted : tokens.primary} />
              </Pressable>
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} tokens={tokens} reason="pdf" />
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },
  pageTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginBottom: 2 },
  card: { marginBottom: 0 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleName: { fontSize: 15, fontWeight: '700', marginTop: 2 },

  // Wizard
  wizardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipFlex: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  wizardDivider: { height: 0.5, marginVertical: 14 },
  textArea: { minHeight: 80 },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  suggestionText: { fontSize: 12, flex: 1, lineHeight: 17 },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  suggestionBtnText: { fontSize: 12, fontWeight: '700' },
  mediaRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingVertical: 10,
  },
  mediaBtnText: { fontWeight: '700', fontSize: 13 },
  dtcPanel: { marginTop: 12, gap: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 14 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, borderWidth: 0.5 },
  alertText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Can drive banner
  driveBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  driveIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  driveText: { flex: 1 },
  driveLabel: { fontSize: 16, fontWeight: '800' },
  driveSub: { fontSize: 12, marginTop: 2, opacity: 0.75 },

  // Result
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  resultIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 16, fontWeight: '700', flex: 1, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5 },
  tagText: { fontSize: 12, fontWeight: '700' },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confLabel: { fontSize: 12, fontWeight: '600' },
  confValue: { fontSize: 12, fontWeight: '700' },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  causeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  causeNum: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  causeNumText: { fontSize: 11, fontWeight: '800' },
  causeBody: { flex: 1 },
  causeName: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  causeBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  causeBarBg: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  causeBarFill: { height: 3, borderRadius: 2 },
  causePct: { fontSize: 11, width: 30, textAlign: 'right' },
  riskBox: { padding: 14, borderRadius: 14, borderWidth: 1 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  riskTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  riskText: { fontSize: 13, lineHeight: 19 },
  adviceBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  adviceText: { fontSize: 13, flex: 1, lineHeight: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  checkDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  checkText: { fontSize: 13, flex: 1, lineHeight: 19 },
  mechanicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  checkbox: { fontSize: 15, flexShrink: 0, marginTop: -1 },
  questionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  questionRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  questionNum: { fontSize: 13, fontWeight: '800', width: 18, flexShrink: 0 },
  questionText: { fontSize: 13, flex: 1, lineHeight: 19 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 16, borderWidth: 0.5 },
  shareBtnText: { fontSize: 14, fontWeight: '700' },
  proBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5 },
  proBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  chatTitle: { fontSize: 14, fontWeight: '700' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 0.5, marginBottom: 8 },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  chatLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 12, borderTopWidth: 0.5 },
  chatInput: { flex: 1, fontSize: 14, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  sendBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
