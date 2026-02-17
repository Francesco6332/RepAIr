import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { createPrediagnosis } from '../services/api';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { PrediagnosisResult } from '@repairo/shared';

export function DiagnoseScreen() {
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);

  const [prompt, setPrompt] = useState('My car shakes when braking at low speed.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrediagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDiagnose = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createPrediagnosis({
        mode: 'text',
        prompt,
        region: 'US',
        vehicle: {
          make: 'Ford',
          model: 'Focus',
          year: 2018,
          mileage: 72000,
          fuelType: 'petrol'
        }
      });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[tokens.bg, tokens.bgAlt]} style={styles.page}>
      <Text style={[styles.title, { color: tokens.text }]}>RepAIro Prediagnosis</Text>
      <GlassCard backgroundColor={tokens.glass}>
        <Text style={[styles.label, { color: tokens.textMuted }]}>Describe your issue</Text>
        <TextInput
          multiline
          value={prompt}
          onChangeText={setPrompt}
          style={[styles.input, { color: tokens.text, borderColor: 'rgba(255,255,255,0.14)' }]}
          placeholder="Noise, warning light, vibration..."
          placeholderTextColor={tokens.textMuted}
        />
        <PrimaryButton label="Run AI Prediagnosis" onPress={onDiagnose} color={tokens.primary} />
      </GlassCard>

      {loading && <ActivityIndicator size="large" color={tokens.accent} style={styles.loader} />}
      {error ? <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text> : null}

      {result ? (
        <GlassCard backgroundColor={tokens.glass}>
          <View style={styles.row}>
            <Ionicons name="construct-outline" size={18} color={tokens.accent} />
            <Text style={[styles.resultTitle, { color: tokens.text }]}>{result.probableIssue}</Text>
          </View>
          <Text style={[styles.resultLine, { color: tokens.textMuted }]}>Confidence: {Math.round(result.confidence * 100)}%</Text>
          <Text style={[styles.resultLine, { color: tokens.textMuted }]}>Urgency: {result.urgency}</Text>
          <Text style={[styles.resultLine, { color: tokens.textMuted }]}>Estimated Cost: ${result.estimatedCostMin} - ${result.estimatedCostMax}</Text>
          <Text style={[styles.resultLine, { color: tokens.text }]}>{result.safetyAdvice}</Text>
        </GlassCard>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 18,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 24
  },
  label: {
    marginBottom: 8,
    fontWeight: '600'
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    textAlignVertical: 'top'
  },
  loader: {
    marginTop: 10
  },
  error: {
    fontWeight: '600'
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  resultLine: {
    marginTop: 3
  }
});
