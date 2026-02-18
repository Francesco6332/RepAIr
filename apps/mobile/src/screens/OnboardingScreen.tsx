import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type Slide = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  title: string;
  subtitle: string;
  features?: string[];
  bgColors: [string, string, string];
};

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'car-sport',
    accent: '#34D399',
    title: 'Your AI\nCar Expert',
    subtitle: 'Diagnose any issue, find trusted mechanics, and manage your fleet — all in one app.',
    bgColors: ['#080B12', '#0a1a2e', '#0d2244'],
  },
  {
    key: 'diagnosis',
    icon: 'pulse',
    accent: '#22D3EE',
    title: 'AI Diagnosis\nin Seconds',
    subtitle: 'Describe the problem in words, snap a photo, or record the noise. Claude AI does the rest.',
    features: ['Text description', 'Photo analysis', 'Audio detection'],
    bgColors: ['#080B12', '#031820', '#052330'],
  },
  {
    key: 'mechanics',
    icon: 'map',
    accent: '#A78BFA',
    title: 'Expert Help\nNearby',
    subtitle: 'Find vetted workshops sorted by distance. Call or navigate directly from the app.',
    features: ['GPS-based search', 'Distance & hours', 'One-tap call'],
    bgColors: ['#080B12', '#0e0a20', '#180d34'],
  },
  {
    key: 'garage',
    icon: 'car',
    accent: '#FBBF24',
    title: 'Your Digital\nGarage',
    subtitle: 'Add all your vehicles, switch between them instantly, and always have context for your AI.',
    features: ['Multiple vehicles', 'Fuel type tracking', 'One-tap select'],
    bgColors: ['#080B12', '#1a1003', '#2a1a05'],
  },
];

type Props = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: Props) {
  const Gradient = LinearGradient as unknown as React.ComponentType<any>;
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const iconScale = useRef(new Animated.Value(1)).current;

  const isLast = currentIndex === SLIDES.length - 1;

  const animateIcon = () => {
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1.15, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        setCurrentIndex(viewableItems[0].index ?? 0);
        animateIcon();
      }
    }
  ).current;

  const goNext = () => {
    if (isLast) {
      onContinue();
      return;
    }
    const next = currentIndex + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.root}>
      {/* Full-screen gradient — changes with slide */}
      <Gradient
        colors={slide?.bgColors ?? SLIDES[0].bgColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      <Pressable
        onPress={onContinue}
        style={[styles.skipBtn, { top: insets.top + 16 }]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Icon area */}
            <View style={styles.iconArea}>
              <View style={[styles.iconGlowOuter, { backgroundColor: item.accent + '10' }]}>
                <View style={[styles.iconGlowInner, { backgroundColor: item.accent + '22' }]}>
                  <Animated.View style={[styles.iconCircle, { backgroundColor: item.accent + '30', transform: [{ scale: iconScale }] }]}>
                    <Ionicons name={item.icon} size={72} color={item.accent} />
                  </Animated.View>
                </View>
              </View>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingBottom: insets.bottom + 180 }]}>
              <Text style={[styles.title, { color: '#FFFFFF' }]}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>

              {item.features ? (
                <View style={styles.featureList}>
                  {item.features.map((f) => (
                    <View key={f} style={styles.featureChip}>
                      <View style={[styles.featureDot, { backgroundColor: item.accent }]} />
                      <Text style={[styles.featureText, { color: item.accent }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => flatRef.current?.scrollToIndex({ index: i, animated: true })}>
              <View
                style={[
                  styles.dot,
                  i === currentIndex
                    ? { width: 24, backgroundColor: slide?.accent ?? '#34D399' }
                    : { width: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Next / Get Started */}
        <Pressable
          onPress={goNext}
          style={[styles.nextBtn, { backgroundColor: slide?.accent ?? '#34D399' }]}
        >
          <Gradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text style={styles.nextBtnText}>
            {isLast ? 'See Plans' : 'Next'}
          </Text>
          <Ionicons
            name={isLast ? 'sparkles' : 'arrow-forward'}
            size={16}
            color="#020617"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080B12' },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skipText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  iconGlowOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlowInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 24,
  },
  featureList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 13, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  nextBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#020617',
    letterSpacing: 0.2,
  },
});
