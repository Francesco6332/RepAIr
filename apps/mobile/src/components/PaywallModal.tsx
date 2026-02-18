import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens } from '../theme/tokens';
import { FREE_DAILY_LIMIT } from '../services/usage';

type Props = {
  visible: boolean;
  onClose: () => void;
  tokens: ThemeTokens;
};

const PRO_COLOR = '#A78BFA';

const PRO_PERKS = [
  { icon: 'infinite' as const, label: 'Unlimited daily diagnoses' },
  { icon: 'image' as const, label: 'Photo & Audio analysis' },
  { icon: 'time' as const, label: 'Full diagnosis history' },
  { icon: 'flash' as const, label: 'Priority AI responses' },
  { icon: 'document-text' as const, label: 'Export & share reports' },
];

export function PaywallModal({ visible, onClose, tokens }: Props) {
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 180, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const onUpgrade = () => {
    Alert.alert(
      'Pro Plan — Coming Soon',
      'We\'re finalizing the Pro plan. Stay on Free and we\'ll notify you when it launches!',
      [{ text: 'Got it', onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <GlassBlur intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.60)' }]} />
      </Animated.View>

      <View style={styles.centeredView}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Glass background */}
          <GlassBlur intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 8, 28, 0.72)' }]} />
          {/* Purple glow top */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Gradient
              colors={[PRO_COLOR + '18', 'rgba(0,0,0,0)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.4 }}
            />
          </View>

          {/* Close button */}
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={styles.content}>
            {/* Icon */}
            <View style={[styles.iconRing, { borderColor: PRO_COLOR + '40' }]}>
              <View style={[styles.iconBg, { backgroundColor: PRO_COLOR + '20' }]}>
                <Ionicons name="lock-closed" size={32} color={PRO_COLOR} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Daily limit reached</Text>
            <Text style={styles.subtitle}>
              You've used all {FREE_DAILY_LIMIT} free diagnoses for today.{'\n'}
              Limit resets at midnight.
            </Text>

            {/* Divider with "unlock with pro" */}
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <Text style={styles.dividerText}>Unlock with Pro</Text>
              <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            </View>

            {/* Pro perks */}
            <View style={styles.perks}>
              {PRO_PERKS.map((p) => (
                <View key={p.label} style={styles.perk}>
                  <View style={[styles.perkIcon, { backgroundColor: PRO_COLOR + '18' }]}>
                    <Ionicons name={p.icon} size={14} color={PRO_COLOR} />
                  </View>
                  <Text style={styles.perkText}>{p.label}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <Pressable onPress={onUpgrade} style={styles.upgradeCta}>
              <Gradient
                colors={[PRO_COLOR, '#7C3AED']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Gradient
                  colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </View>
              <Ionicons name="sparkles" size={15} color="#fff" />
              <Text style={styles.upgradeText}>Upgrade to Pro · €9.99/mo</Text>
            </Pressable>

            {/* Secondary */}
            <Pressable onPress={onClose} style={styles.laterBtn}>
              <Text style={styles.laterText}>Come back tomorrow</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 20,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 28, alignItems: 'center' },
  iconRing: {
    borderRadius: 40,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  iconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 18,
  },
  divider: { flex: 1, height: 0.5 },
  dividerText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  perks: { width: '100%', gap: 10, marginBottom: 24 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: { color: 'rgba(255,255,255,0.80)', fontSize: 14 },
  upgradeCta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  upgradeText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  laterBtn: { paddingVertical: 8 },
  laterText: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '600' },
});
