import React from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  backgroundColor: string;
  style?: ViewStyle;
};

export function GlassCard({ children, backgroundColor, style }: Props) {
  const GlassBlur = BlurView as unknown as React.ComponentType<any>;
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Frosted blur layer */}
      <GlassBlur intensity={70} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Base tint */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />

      {/* Specular highlight — top-edge shimmer */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Gradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
        />
      </View>

      {/* Left-edge subtle shimmer */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Gradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.35, y: 0 }}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 20,
  },
});
