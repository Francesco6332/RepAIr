import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, color, disabled }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: pressed || disabled ? 0.75 : 1 },
      ]}
    >
      {/* Glass sheen overlay */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Gradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
