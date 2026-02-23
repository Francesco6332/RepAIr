import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useThemeStore } from '../store/useThemeStore';
import { ThemePreset, themes } from '../theme/tokens';
import { getProfile, updateProfile } from '../services/profile';
import { supabase } from '../services/supabase';
import { useVehicleStore } from '../store/useVehicleStore';
import { useI18n } from '../i18n';

type Props = { session: Session };

function getInitials(email: string, displayName?: string | null): string {
  if (displayName) {
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

const presets = Object.keys(themes) as ThemePreset[];

export function ProfileScreen({ session }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const { preset, setPreset } = useThemeStore();
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t } = useI18n();
  const { vehicles } = useVehicleStore();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    getProfile(session.user.id)
      .then((p) => {
        if (p?.display_name) setDisplayName(p.display_name);
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [session.user.id]);

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(session.user.id, { display_name: displayName.trim() });
    } catch {
      Alert.alert(t('profile.errorTitle'), t('profile.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    Alert.alert(t('profile.signoutTitle'), t('profile.signoutBody'), [
      { text: t('profile.cancel'), style: 'cancel' },
      { text: t('profile.signout'), style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const initials = getInitials(session.user.email ?? 'U', displayName || undefined);

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
        <Text style={[styles.pageTitle, { color: tokens.text }]}>{t('profile.title')}</Text>

        {/* Avatar & identity */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarRing, { borderColor: tokens.primary + '60' }]}>
              <Gradient
                colors={[tokens.primary, tokens.accent]}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </Gradient>
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.nameLabel, { color: tokens.text }]}>
                {displayName || session.user.email?.split('@')[0] || t('profile.driver')}
              </Text>
              <Text style={[styles.emailLabel, { color: tokens.textMuted }]}>
                {session.user.email}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, { borderTopColor: tokens.glassBorder }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: tokens.primary }]}>
                {vehicles.length}
              </Text>
              <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('profile.vehicles')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: tokens.glassBorder }]} />
            <View style={styles.stat}>
              <Ionicons name="shield-checkmark" size={20} color={tokens.accent} />
              <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('profile.verified')}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Edit name */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('profile.displayName')}</Text>
          {loadingProfile ? (
            <ActivityIndicator color={tokens.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <GlassInput
                tokens={tokens}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('profile.namePlaceholder')}
                returnKeyType="done"
                onSubmitEditing={saveDisplayName}
              />
              <PrimaryButton
                label={saving ? t('profile.saving') : t('profile.saveName')}
                onPress={saveDisplayName}
                color={tokens.primary}
                disabled={saving}
              />
            </>
          )}
        </GlassCard>

        {/* Theme selection */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('profile.theme')}</Text>
          <View style={styles.themeGrid}>
            {presets.map((item) => {
              const palette = themes[item];
              const selected = item === preset;
              return (
                <Pressable
                  key={item}
                  onPress={() => setPreset(item)}
                  style={[
                    styles.swatch,
                    {
                      borderColor: selected ? palette.primary : 'rgba(255,255,255,0.12)',
                      borderWidth: selected ? 1.5 : 0.5,
                    },
                  ]}
                >
                  <Gradient
                    colors={[palette.bg, palette.primary]}
                    style={styles.swatchInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.swatchRow}>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      ) : null}
                      <Text style={styles.swatchText}>{palette.name}</Text>
                    </View>
                  </Gradient>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* Sign out */}
        <GlassCard backgroundColor={tokens.glass} style={styles.card}>
          <Pressable onPress={signOut} style={styles.signOutRow}>
            <Ionicons name="log-out-outline" size={20} color={tokens.danger} />
            <Text style={[styles.signOutText, { color: tokens.danger }]}>{t('profile.signout')}</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  card: { marginBottom: 0 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: {
    borderRadius: 38,
    borderWidth: 1.5,
    padding: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  identityInfo: { flex: 1, gap: 4 },
  nameLabel: { fontSize: 18, fontWeight: '700' },
  emailLabel: { fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 0.5, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  themeGrid: { gap: 10 },
  swatch: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  swatchInner: { padding: 14 },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatchText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signOutText: { fontWeight: '700', fontSize: 15 },
});
