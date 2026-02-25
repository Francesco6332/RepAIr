import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useI18n } from '../i18n';
import { supabase } from '../services/supabase';
import { ensureProfile } from '../services/profile';

type Props = {
  route: {
    params: {
      email: string;
      displayName?: string;
    };
  };
};

export function AuthOtpScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { email, displayName } = route.params;
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const preset = useThemeStore((s) => s.preset);
  const tokens = useMemo(() => themes[preset], [preset]);
  const { t } = useI18n();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyCode = async () => {
    setError(null);
    setNotice(null);
    if (!code.trim()) {
      setError(t('auth.otpRequired'));
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      if (data.user) {
        await ensureProfile(data.user.id, displayName);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.genericError');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setNotice(t('auth.otpResent'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.genericError');
      setError(message);
    } finally {
      setResending(false);
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
          <GlassCard backgroundColor={tokens.glass}>
            <Text style={[styles.formTitle, { color: tokens.text }]}>{t('auth.otpTitle')}</Text>
            <Text style={[styles.formSubtitle, { color: tokens.textMuted }]}>
              {t('auth.otpSubtitle')} {email}
            </Text>

            <GlassInput
              tokens={tokens}
              label={t('auth.otpLabel')}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={verifyCode}
            />

            {error ? (
              <View
                style={[
                  styles.messageBox,
                  { backgroundColor: tokens.danger + '1A', borderColor: tokens.danger + '40' },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={14} color={tokens.danger} />
                <Text style={[styles.messageText, { color: tokens.danger }]}>{error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View
                style={[
                  styles.messageBox,
                  { backgroundColor: tokens.primary + '1A', borderColor: tokens.primary + '40' },
                ]}
              >
                <Ionicons name="mail-outline" size={14} color={tokens.primary} />
                <Text style={[styles.messageText, { color: tokens.primary }]}>{notice}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label={loading ? t('auth.wait') : t('auth.verifyCode')}
              onPress={verifyCode}
              color={tokens.primary}
              disabled={loading}
            />

            <Pressable onPress={resendCode} disabled={resending || loading} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryText, { color: tokens.accent }]}>
                {resending ? t('auth.wait') : t('auth.resendCode')}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryText, { color: tokens.textMuted }]}>{t('auth.back')}</Text>
            </Pressable>
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
  formTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  formSubtitle: { fontSize: 14, marginBottom: 20 },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 12,
  },
  messageText: { fontSize: 13, fontWeight: '600', flex: 1 },
  secondaryBtn: { marginTop: 14 },
  secondaryText: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
