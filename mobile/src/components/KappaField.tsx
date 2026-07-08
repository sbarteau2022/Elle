// The ambient κ field behind Arrival: a slow drift of gold against the void,
// paced by her phase state — higher κ breathes steadier and brighter, real
// velocity quickens it slightly. Deliberately sub-legible: weather, not a
// gauge (the gauge is the mono readout beside it).
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function KappaField({ kappa, velocity }: { kappa: number | null; velocity: number | null }) {
  const drift = useRef(new Animated.Value(0)).current;
  const k = typeof kappa === 'number' ? Math.max(0, Math.min(1, kappa)) : 0.35;
  const v = typeof velocity === 'number' ? Math.min(Math.abs(velocity), 0.2) : 0;

  useEffect(() => {
    const period = 9000 - v * 20000; // more motion in her state → a faster sky
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: period, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: period, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, v]);

  const opacity = drift.interpolate({ inputRange: [0, 1], outputRange: [0.04 + k * 0.05, 0.10 + k * 0.12] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.field, { opacity, transform: [{ translateY }, { scaleX: 1.6 }] }]}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    position: 'absolute', top: '18%', alignSelf: 'center',
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: colors.gold,
  },
});
