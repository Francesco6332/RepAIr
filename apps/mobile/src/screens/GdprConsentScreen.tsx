import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { PrimaryButton } from '../components/PrimaryButton';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { useI18n } from '../i18n';

type Props = { onAccept: () => void };

export function GdprConsentScreen({ onAccept }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const { preset } = useThemeStore();
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t } = useI18n();

  const [declined, setDeclined] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const dataItems = [
    { icon: 'person-outline' as const, label: t('gdpr.item.account') },
    { icon: 'car-outline' as const, label: t('gdpr.item.vehicles') },
    { icon: 'chatbubble-outline' as const, label: t('gdpr.item.diagnoses') },
    { icon: 'location-outline' as const, label: t('gdpr.item.location') },
  ];

  const processors = [
    t('gdpr.processor.openai'),
    t('gdpr.processor.supabase'),
  ];

  return (
    <Gradient
      colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]}
      style={[styles.page, { paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo mark */}
        <View style={styles.logoRow}>
          <Gradient
            colors={[tokens.primary, tokens.accent]}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </Gradient>
          <Text style={[styles.appName, { color: tokens.text }]}>RepAIr</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: tokens.text }]}>{t('gdpr.title')}</Text>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>{t('gdpr.subtitle')}</Text>

        {/* Data collected */}
        <View style={[styles.card, { backgroundColor: tokens.glass, borderColor: tokens.glassBorder }]}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Raccogliamo</Text>
          {dataItems.map((item) => (
            <View key={item.label} style={styles.itemRow}>
              <Ionicons name={item.icon} size={16} color={tokens.primary} />
              <Text style={[styles.itemText, { color: tokens.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Third-party processors */}
        <View style={[styles.card, { backgroundColor: tokens.glass, borderColor: tokens.glassBorder }]}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>{t('gdpr.processor.title')}</Text>
          {processors.map((p) => (
            <View key={p} style={styles.itemRow}>
              <Ionicons name="server-outline" size={16} color={tokens.accent} />
              <Text style={[styles.itemText, { color: tokens.textMuted }]}>{p}</Text>
            </View>
          ))}
          <Text style={[styles.transferNote, { color: tokens.textMuted }]}>
            {t('gdpr.processor.transfer')}
          </Text>
        </View>

        {/* Policy link */}
        <Pressable onPress={() => setShowPolicy(true)} style={styles.policyRow}>
          <Ionicons name="document-text-outline" size={15} color={tokens.primary} />
          <Text style={[styles.policyLink, { color: tokens.primary }]}>{t('gdpr.policyLink')}</Text>
          <Ionicons name="chevron-forward" size={14} color={tokens.primary} />
        </Pressable>

        {/* Decline warning */}
        {declined && (
          <View style={[styles.warningBox, { borderColor: tokens.danger + '60', backgroundColor: tokens.danger + '18' }]}>
            <Ionicons name="warning-outline" size={16} color={tokens.danger} />
            <Text style={[styles.warningText, { color: tokens.danger }]}>{t('gdpr.declineWarning')}</Text>
          </View>
        )}

        {/* CTAs */}
        <View style={styles.ctaStack}>
          <PrimaryButton
            label={t('gdpr.accept')}
            onPress={onAccept}
            color={tokens.primary}
          />
          <Pressable
            onPress={() => setDeclined(true)}
            style={styles.declineBtn}
          >
            <Text style={[styles.declineText, { color: tokens.textMuted }]}>{t('gdpr.decline')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PrivacyPolicyModal
        visible={showPolicy}
        onClose={() => setShowPolicy(false)}
        tokens={tokens}
      />
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 22, gap: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 8 },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { fontSize: 14, flex: 1, lineHeight: 20 },
  transferNote: { fontSize: 12, lineHeight: 17, marginTop: 4, fontStyle: 'italic' },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  policyLink: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  warningText: { fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '600' },
  ctaStack: { gap: 12 },
  declineBtn: { alignItems: 'center', paddingVertical: 10 },
  declineText: { fontSize: 14 },
});
