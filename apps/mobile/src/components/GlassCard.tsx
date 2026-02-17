import React from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  backgroundColor: string;
};

export function GlassCard({ children, backgroundColor }: Props) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={35} tint="dark" style={[styles.card, { backgroundColor }]}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  card: {
    padding: 16
  }
});
