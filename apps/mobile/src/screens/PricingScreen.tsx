import React, { useRef } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPlan } from '../services/usage';

type Props = {
  onComplete: () => void;
};

type FeatureRow = { label: string; free: boolean; pro: boolean };

const FEATURES: FeatureRow[] = [
  { label: 'AI text diagnosis', free: true, pro: true },
  { label: 'Vehicle management', free: true, pro: true },
  { label: 'Mechanic finder', free: true, pro: true },
  { label: 'Daily diagnoses', free: true, pro: true },
  { label: 'Photo analysis', free: false, pro: true },
  { label: 'Audio analysis', free: false, pro: true },
  { label: 'Diagnosis history', free: false, pro: true },
  { label: 'Priority AI', free: false, pro: true },
  { label: 'Export reports', free: false, pro: true },
];

const FREE_COLOR = '#34D399';
const PRO_COLOR = '#A78BFA';

function FeatureCheck({ ok, color }: { ok: boolean; color: string }) {
  if (ok) return <Ionicons name="checkmark-circle" size={18} color={color} />;
  return <Ionicons name="remove-circle-outline" size={18} color="rgba(255,255,255,0.18)" />;
}

export function PricingScreen({ onComplete }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();

  const proScale = useRef(new Animated.Value(1)).current;

  const animatePro = () => {
    Animated.sequence([
      Animated.spring(proScale, { toValue: 0.97, useNativeDriver: true }),
      Animated.spring(proScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const onSelectFree = async () => {
    await setPlan('free');
    onComplete();
  };

  const onSelectPro = () => {
    animatePro();
    Alert.alert(
      'Pro Plan — Coming Soon',
      "We're finalizing the Pro plan with unlimited diagnoses, photo & audio analysis, and much more.\n\nStay on Free for now and we'll notify you when Pro launches.",
      [{ text: 'Got it', onPress: onComplete }]
    );
  };

  return (
    <View style={styles.root}>
      <Gradient
        colors={['#080B12', '#0d1320', '#080B12']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.plansBadge}>
              <Ionicons name="sparkles" size={12} color={PRO_COLOR} />
              <Text style={[styles.plansBadgeText, { color: PRO_COLOR }]}>PRICING PLANS</Text>
            </View>
          </View>
          <Text style={styles.heading}>Choose your plan</Text>
          <Text style={styles.subheading}>
            Start free. Upgrade when you need more power.
          </Text>
        </View>

        {/* ─── FREE CARD ─────────────────────────── */}
        <View style={styles.planCard}>
          <GlassBlur intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,22,40,0.55)' }]} />
          {/* Specular */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Gradient
              colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.4 }}
            />
          </View>

          <View style={styles.planContent}>
            <View style={styles.planHeader}>
              <View style={[styles.planBadge, { backgroundColor: FREE_COLOR + '20', borderColor: FREE_COLOR + '40' }]}>
                <Text style={[styles.planBadgeText, { color: FREE_COLOR }]}>FREE</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceMain, { color: '#fff' }]}>€0</Text>
                <Text style={styles.pricePer}>/month</Text>
              </View>
              <Text style={[styles.planLimitNote, { color: FREE_COLOR }]}>
                5 diagnoses · every day
              </Text>
            </View>

            {/* Feature list */}
            <View style={styles.featureRows}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <FeatureCheck ok={f.free} color={FREE_COLOR} />
                  <Text
                    style={[
                      styles.featureLabel,
                      { color: f.free ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' },
                    ]}
                  >
                    {f.label}
                    {f.label === 'Daily diagnoses' ? ' (5/day)' : ''}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable onPress={onSelectFree} style={[styles.cta, { borderColor: FREE_COLOR + '60', backgroundColor: FREE_COLOR + '15' }]}>
              <Text style={[styles.ctaText, { color: FREE_COLOR }]}>Continue for Free</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── PRO CARD ─────────────────────────── */}
        <Animated.View style={[styles.planCard, styles.proPlanCard, { transform: [{ scale: proScale }] }]}>
          <GlassBlur intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30, 20, 60, 0.65)' }]} />
          {/* Purple glow specular */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Gradient
              colors={[PRO_COLOR + '20', 'rgba(0,0,0,0)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
            />
          </View>

          {/* Most Popular badge */}
          <View style={styles.popularBadge}>
            <Gradient colors={[PRO_COLOR, '#7C3AED']} style={styles.popularBadgeGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="sparkles" size={11} color="#fff" />
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </Gradient>
          </View>

          <View style={styles.planContent}>
            <View style={styles.planHeader}>
              <View style={[styles.planBadge, { backgroundColor: PRO_COLOR + '20', borderColor: PRO_COLOR + '40' }]}>
                <Text style={[styles.planBadgeText, { color: PRO_COLOR }]}>PRO</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceMain, { color: '#fff' }]}>€9.99</Text>
                <Text style={styles.pricePer}>/month</Text>
              </View>
              <Text style={[styles.planLimitNote, { color: PRO_COLOR }]}>
                7-day free trial · cancel anytime
              </Text>
            </View>

            <View style={styles.featureRows}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <FeatureCheck ok={f.pro} color={PRO_COLOR} />
                  <Text style={[styles.featureLabel, { color: 'rgba(255,255,255,0.9)' }]}>
                    {f.label}
                    {f.label === 'Daily diagnoses' ? ' (unlimited)' : ''}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable onPress={onSelectPro} style={[styles.cta, styles.proCtaBtn]}>
              <Gradient
                colors={[PRO_COLOR, '#7C3AED']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {/* Glass sheen */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Gradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={[styles.ctaText, { color: '#fff' }]}>Start 7-Day Free Trial</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Reassurance row */}
        <View style={styles.reassurance}>
          {['No card required for Free', 'Cancel Pro anytime', 'Secure payments'].map((t) => (
            <View key={t} style={styles.reassuranceItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.35)" />
              <Text style={styles.reassuranceText}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080B12' },
  scroll: { paddingHorizontal: 20, gap: 16 },

  header: { alignItems: 'center', marginBottom: 8 },
  badgeRow: { marginBottom: 14 },
  plansBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(167,139,250,0.30)',
  },
  plansBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heading: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ─── Cards
  planCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  proPlanCard: {
    borderColor: 'rgba(167,139,250,0.40)',
    borderWidth: 1,
  },
  planContent: { padding: 22 },

  // Popular badge (sits above card)
  popularBadge: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  popularBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  planHeader: { marginBottom: 20, marginTop: 8 },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  planBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },
  priceMain: { fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 52 },
  pricePer: { color: 'rgba(255,255,255,0.40)', fontSize: 14, marginBottom: 6 },
  planLimitNote: { fontSize: 13, fontWeight: '600' },

  featureRows: { gap: 12, marginBottom: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureLabel: { fontSize: 14, flex: 1 },

  cta: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  proCtaBtn: {
    borderWidth: 0,
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // Reassurance
  reassurance: { gap: 8, alignItems: 'center' },
  reassuranceItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reassuranceText: { color: 'rgba(255,255,255,0.30)', fontSize: 12 },
});
