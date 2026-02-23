import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HealthScore } from '../utils/healthScore';

type Props = {
  health: HealthScore;
  textColor: string;
  trackColor: string;
};

export function HealthScoreWidget({ health, textColor, trackColor }: Props) {
  const fillWidth = `${health.score}%` as any;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: textColor }]}>Health</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { color: health.color }]}>{health.score}</Text>
          <Text style={[styles.scoreOf, { color: textColor }]}>/100</Text>
          <View style={[styles.pill, { backgroundColor: health.color + '22', borderColor: health.color + '55' }]}>
            <Text style={[styles.pillText, { color: health.color }]}>{health.label}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: fillWidth, backgroundColor: health.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  score: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreOf: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
    marginRight: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
