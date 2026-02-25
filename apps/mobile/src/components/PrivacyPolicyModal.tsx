import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeTokens } from '../theme/tokens';
import { useI18n } from '../i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  tokens: ThemeTokens;
};

export function PrivacyPolicyModal({ visible, onClose, tokens }: Props) {
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const sections = [
    { titleKey: 'privacy.controller.title', bodyKey: 'privacy.controller.body' },
    { titleKey: 'privacy.data.title', bodyKey: 'privacy.data.body' },
    { titleKey: 'privacy.purposes.title', bodyKey: 'privacy.purposes.body' },
    { titleKey: 'privacy.processors.title', bodyKey: 'privacy.processors.body' },
    { titleKey: 'privacy.transfers.title', bodyKey: 'privacy.transfers.body' },
    { titleKey: 'privacy.retention.title', bodyKey: 'privacy.retention.body' },
    { titleKey: 'privacy.rights.title', bodyKey: 'privacy.rights.body' },
    { titleKey: 'privacy.contact.title', bodyKey: 'privacy.contact.body' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <GlassBlur intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: tokens.bgAlt,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: tokens.glassBorder }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: tokens.text }]}>{t('privacy.title')}</Text>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: tokens.glass }]}>
            <Ionicons name="close" size={18} color={tokens.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.lastUpdated, { color: tokens.textMuted }]}>
            Ultimo aggiornamento: 25 febbraio 2026
          </Text>

          {sections.map((s) => (
            <View key={s.titleKey} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: tokens.primary }]}>{t(s.titleKey)}</Text>
              <Text style={[styles.sectionBody, { color: tokens.textMuted }]}>{t(s.bodyKey)}</Text>
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: tokens.glass, borderColor: tokens.glassBorder }]}
        >
          <Text style={[styles.closeButtonText, { color: tokens.text }]}>{t('privacy.close')}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 20 },
  lastUpdated: { fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionBody: { fontSize: 14, lineHeight: 21 },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: { fontSize: 15, fontWeight: '700' },
});
