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
import { analyzeAudio, analyzePhoto, createPrediagnosis, lookupDtc, sendFollowUp } from '../services/api';
import { saveDiagnosis } from '../services/diagnoses';
import { shareDiagnosisPdf } from '../utils/buildDiagnosisPdf';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { ChatMessage, PrediagnosisResult } from '@repairo/shared';
import { useVehicleStore } from '../store/useVehicleStore';

type Props = { session: Session };

const URGENCY_COLOR: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#FB923C',
  critical: '#F87171',
};

export function DiagnoseScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { vehicles, selectedVehicleId } = useVehicleStore();

  const [prompt, setPrompt] = useState('');
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

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];

  const vehicleContext = selectedVehicle
    ? {
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        mileage: selectedVehicle.current_mileage,
        fuelType: selectedVehicle.fuel_type ?? undefined,
      }
    : null;

  const withGuard = async (
    fn: () => Promise<PrediagnosisResult>,
    type: 'text' | 'photo' | 'audio',
    userContent: string
  ) => {
    if (!vehicleContext) {
      setError('Add and select a vehicle first in the Vehicles tab.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);
    try {
      const data = await fn();
      setResult(data);
      setConversationHistory([
        { role: 'user', content: userContent },
        { role: 'assistant', content: `${data.probableIssue}. Confidence: ${Math.round(data.confidence * 100)}%. ${data.safetyAdvice}` },
      ]);
      if (selectedVehicle) {
        saveDiagnosis({
          userId: session.user.id,
          vehicleId: selectedVehicle.id,
          type,
          result: data,
        }).catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onDiagnoseText = async () => {
    Keyboard.dismiss();
    await withGuard(async () =>
      createPrediagnosis({ mode: 'text', prompt, region: 'IT', vehicle: vehicleContext! }),
      'text',
      prompt || 'Car issue description'
    );
  };

  const onAnalyzePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo permission is required.'); return; }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.base64) { setError('Failed to read image data.'); return; }

    await withGuard(async () =>
      analyzePhoto({ imageBase64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg', region: 'IT', vehicle: vehicleContext! }),
      'photo',
      'Photo analysis of a visible car issue'
    );
  };

  const onToggleAudio = async () => {
    if (!recording) {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { setError('Microphone permission is required.'); return; }
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
    await withGuard(async () =>
      analyzeAudio({
        audioTranscript: `Driver recorded abnormal mechanical noise for about ${seconds} seconds.`,
        region: 'IT',
        vehicle: vehicleContext!,
      }),
      'audio',
      `Audio recording of mechanical noise (${seconds}s)`
    );
  };

  const onLookupDtc = async () => {
    Keyboard.dismiss();
    if (!dtcCode.trim()) { setError('Enter an OBD-II code first (e.g. P0420).'); return; }
    await withGuard(async () =>
      lookupDtc({ code: dtcCode.trim(), region: 'IT', vehicle: vehicleContext! }),
      'text',
      `OBD-II code: ${dtcCode.trim()}`
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
      const response = await sendFollowUp({ messages: newHistory, vehicle: vehicleContext, region: 'IT' });
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
    setSharing(true);
    try {
      await shareDiagnosisPdf({
        vehicle: selectedVehicle
          ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}`
          : 'Unknown vehicle',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        probableIssue: result.probableIssue,
        confidence: result.confidence,
        urgency: result.urgency,
        costMin: result.estimatedCostMin,
        costMax: result.estimatedCostMax,
        safetyAdvice: result.safetyAdvice,
        nextChecks: result.nextChecks,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const urgencyColor = result
    ? (URGENCY_COLOR[result.urgency.toLowerCase()] ?? tokens.warning)
    : tokens.warning;

  return (
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
          <Text style={[styles.pageTitle, { color: tokens.text }]}>Diagnose</Text>
          <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
            AI-powered pre-diagnosis
          </Text>

          {/* Vehicle chip */}
          <GlassCard backgroundColor={tokens.glass} style={styles.card}>
            <View style={styles.vehicleRow}>
              <View style={[styles.vehicleIcon, { backgroundColor: tokens.primaryGlow }]}>
                <Ionicons name="car-sport" size={18} color={tokens.primary} />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleLabel, { color: tokens.textMuted }]}>
                  Active vehicle
                </Text>
                <Text style={[styles.vehicleName, { color: tokens.text }]}>
                  {selectedVehicle
                    ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}`
                    : 'No vehicle selected'}
                </Text>
              </View>
              {!selectedVehicle && (
                <Ionicons name="alert-circle-outline" size={18} color={tokens.warning} />
              )}
            </View>
          </GlassCard>

          {/* Input card */}
          <GlassCard backgroundColor={tokens.glass} style={styles.card}>
            <GlassInput
              tokens={tokens}
              label="Describe the issue"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Noise, warning light, vibration…"
              multiline
              style={styles.textArea}
              textAlignVertical="top"
            />
            <PrimaryButton label="Analyze" onPress={onDiagnoseText} color={tokens.primary} disabled={loading} />

            <View style={styles.mediaRow}>
              <Pressable
                onPress={onAnalyzePhoto}
                style={[styles.mediaBtn, { borderColor: tokens.accent + '80' }]}
              >
                <Ionicons name="image-outline" size={18} color={tokens.accent} />
                <Text style={[styles.mediaBtnText, { color: tokens.accent }]}>Photo</Text>
              </Pressable>
              <Pressable
                onPress={onToggleAudio}
                style={[
                  styles.mediaBtn,
                  {
                    borderColor: recording ? tokens.danger + '80' : tokens.warning + '80',
                    backgroundColor: recording ? tokens.danger + '15' : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={recording ? 'stop-circle' : 'mic-outline'}
                  size={18}
                  color={recording ? tokens.danger : tokens.warning}
                />
                <Text style={[styles.mediaBtnText, { color: recording ? tokens.danger : tokens.warning }]}>
                  {recording ? 'Stop' : 'Audio'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDtcVisible((v) => !v)}
                style={[
                  styles.mediaBtn,
                  {
                    borderColor: dtcVisible ? tokens.primary + '80' : tokens.glassBorder,
                    backgroundColor: dtcVisible ? tokens.primaryGlow : 'transparent',
                  },
                ]}
              >
                <Ionicons name="barcode-outline" size={18} color={dtcVisible ? tokens.primary : tokens.textMuted} />
                <Text style={[styles.mediaBtnText, { color: dtcVisible ? tokens.primary : tokens.textMuted }]}>OBD</Text>
              </Pressable>
            </View>

            {dtcVisible && (
              <View style={styles.dtcPanel}>
                <GlassInput
                  tokens={tokens}
                  label="OBD-II Code"
                  value={dtcCode}
                  onChangeText={(t) => setDtcCode(t.toUpperCase())}
                  placeholder="P0420"
                  autoCapitalize="characters"
                  maxLength={7}
                />
                <PrimaryButton label="Analyze Code" onPress={onLookupDtc} color={tokens.primary} disabled={loading} />
              </View>
            )}
          </GlassCard>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={tokens.primary} />
              <Text style={[styles.loadingText, { color: tokens.textMuted }]}>Analysing…</Text>
            </View>
          )}

          {error ? (
            <View style={[styles.alertBox, { backgroundColor: tokens.danger + '18', borderColor: tokens.danger + '40' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
              <Text style={[styles.alertText, { color: tokens.danger }]}>{error}</Text>
            </View>
          ) : null}

          {result ? (
            <GlassCard backgroundColor={tokens.glass} style={styles.card}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIcon, { backgroundColor: tokens.accent + '20' }]}>
                  <Ionicons name="construct" size={18} color={tokens.accent} />
                </View>
                <Text style={[styles.resultTitle, { color: tokens.text }]}>
                  {result.probableIssue}
                </Text>
              </View>

              <View style={styles.confRow}>
                <Text style={[styles.confLabel, { color: tokens.textMuted }]}>Confidence</Text>
                <Text style={[styles.confValue, { color: tokens.primary }]}>
                  {Math.round(result.confidence * 100)}%
                </Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: tokens.glassBorder }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.round(result.confidence * 100)}%` as any, backgroundColor: tokens.primary },
                  ]}
                />
              </View>

              <View style={styles.tagsRow}>
                <View style={[styles.tag, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor + '50' }]}>
                  <Text style={[styles.tagText, { color: urgencyColor }]}>
                    {result.urgency} urgency
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: tokens.accent + '18', borderColor: tokens.accent + '40' }]}>
                  <Text style={[styles.tagText, { color: tokens.accent }]}>
                    €{result.estimatedCostMin}–€{result.estimatedCostMax}
                  </Text>
                </View>
              </View>

              <View style={[styles.adviceBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={tokens.textMuted} />
                <Text style={[styles.adviceText, { color: tokens.textMuted }]}>
                  {result.safetyAdvice}
                </Text>
              </View>

              <Pressable
                onPress={onSharePdf}
                disabled={sharing}
                style={[styles.shareBtn, { borderColor: tokens.primary + '50', backgroundColor: tokens.primaryGlow }]}
              >
                <Ionicons name={sharing ? 'hourglass-outline' : 'share-outline'} size={15} color={tokens.primary} />
                <Text style={[styles.shareBtnText, { color: tokens.primary }]}>
                  {sharing ? 'Generating…' : 'Export PDF'}
                </Text>
              </Pressable>
            </GlassCard>
          ) : null}

          {result ? (
            <GlassCard backgroundColor={tokens.glass} style={styles.card}>
              <View style={styles.chatHeader}>
                <Ionicons name="chatbubbles-outline" size={15} color={tokens.primary} />
                <Text style={[styles.chatTitle, { color: tokens.text }]}>Continue Diagnosis</Text>
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
                  <Text style={[styles.loadingText, { color: tokens.textMuted }]}>Thinking…</Text>
                </View>
              )}

              <View style={[styles.chatInputRow, { borderTopColor: tokens.glassBorder }]}>
                <TextInput
                  style={[styles.chatInput, { color: tokens.text }]}
                  value={followUpText}
                  onChangeText={setFollowUpText}
                  placeholder="Ask a follow-up question…"
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
                  <Ionicons
                    name="send"
                    size={16}
                    color={chatLoading || !followUpText.trim() ? tokens.textMuted : tokens.primary}
                  />
                </Pressable>
              </View>
            </GlassCard>
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
  card: { marginBottom: 0 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleName: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  textArea: { minHeight: 100 },
  mediaRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingVertical: 11,
  },
  mediaBtnText: { fontWeight: '700', fontSize: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12 },
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
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  resultIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 16, fontWeight: '700', flex: 1, lineHeight: 22 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confLabel: { fontSize: 12, fontWeight: '600' },
  confValue: { fontSize: 12, fontWeight: '700' },
  barBg: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5 },
  tagText: { fontSize: 12, fontWeight: '700' },
  adviceBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  adviceText: { fontSize: 13, flex: 1, lineHeight: 18 },
  dtcPanel: { marginTop: 12, gap: 10 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  chatTitle: { fontSize: 14, fontWeight: '700' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 0.5,
    marginBottom: 8,
  },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  chatLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700' },
});
