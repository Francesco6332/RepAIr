import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/tokens';
import { supabase } from '../services/supabase';
import { ensureProfile } from '../services/profile';
import { useI18n } from '../i18n';

export function AuthScreen() {
  const navigation = useNavigation<any>();
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t } = useI18n();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('auth.required'));
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) { setError(signUpError.message); return; }
        if (data.session?.user) {
          await ensureProfile(data.session.user.id, name || undefined);
          return;
        }

        // In email-confirmation mode Supabase returns no session until user verifies email.
        navigation.navigate('AuthOtp', {
          email: email.trim().toLowerCase(),
          displayName: name.trim() || undefined,
        });
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message); return; }
        if (data.user) await ensureProfile(data.user.id);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Gradient colors={[tokens.bg, tokens.bgAlt, tokens.bgDeep]} style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View
              style={[
                styles.logoIcon,
                { backgroundColor: tokens.primaryGlow, borderColor: tokens.glassBorder },
              ]}
            >
              <Ionicons name="car-sport" size={44} color={tokens.primary} />
            </View>
            <Text style={[styles.appName, { color: tokens.text }]}>RepAIro</Text>
            <Text style={[styles.tagline, { color: tokens.textMuted }]}>
              {t('auth.tagline')}
            </Text>
          </View>

          {/* Auth card */}
          <GlassCard backgroundColor={tokens.glass}>
            <Text style={[styles.formTitle, { color: tokens.text }]}>
              {isSignUp ? t('auth.createTitle') : t('auth.welcomeTitle')}
            </Text>
            <Text style={[styles.formSubtitle, { color: tokens.textMuted }]}>
              {isSignUp ? t('auth.createSubtitle') : t('auth.signinSubtitle')}
            </Text>

            <View style={styles.fields}>
              {isSignUp && (
                <GlassInput
                  tokens={tokens}
                  label={t('auth.name')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('auth.namePlaceholder')}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
              <GlassInput
                tokens={tokens}
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <GlassInput
                tokens={tokens}
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: tokens.danger + '1A',
                    borderColor: tokens.danger + '40',
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={14} color={tokens.danger} />
                <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={loading ? t('auth.wait') : isSignUp ? t('auth.createCta') : t('auth.signinCta')}
              onPress={submit}
              color={tokens.primary}
              disabled={loading}
            />

            <Text
              style={[styles.switchText, { color: tokens.textMuted }]}
              onPress={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
            >
              {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
              <Text style={{ color: tokens.primary, fontWeight: '700' }}>
                {isSignUp ? t('auth.signin') : t('auth.signup')}
              </Text>
            </Text>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 90,
    height: 90,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    marginBottom: 18,
  },
  appName: { fontSize: 40, fontWeight: '900', letterSpacing: -1, marginBottom: 6 },
  tagline: { fontSize: 14, fontWeight: '500' },
  formTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  formSubtitle: { fontSize: 14, marginBottom: 20 },
  fields: { marginBottom: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  switchText: { marginTop: 16, textAlign: 'center', fontSize: 14 },
});
