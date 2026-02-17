import React from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { ThemeTokens } from '../theme/tokens';

type Props = TextInputProps & {
  tokens: ThemeTokens;
  label?: string;
};

export function GlassInput({ tokens, label, style, ...rest }: Props) {
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      ) : null}
      <View style={[styles.inputWrapper, { borderColor: tokens.glassBorder }]}>
        <GlassBlur intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]}
        />
        <TextInput
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { color: tokens.text }, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  input: {
    padding: 14,
    fontSize: 15,
  },
});
