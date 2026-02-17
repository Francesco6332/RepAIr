import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  color: string;
};

export function PrimaryButton({ label, onPress, color }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: color }]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  label: {
    color: '#020617',
    fontWeight: '700'
  }
});
