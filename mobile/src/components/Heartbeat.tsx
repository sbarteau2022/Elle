// The breathing gold heartbeat — the workbench's pulse, in the hand. It only
// breathes when the daemon actually beat recently; a stale heartbeat sits
// still and dim, because a pulse you fake is worse than none.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function Heartbeat({ alive, size = 14 }: { alive: boolean; size?: number }) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alive) { breath.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [alive, breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });

  return (
    <View style={{ width: size * 3, height: size * 3, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[styles.glow, { width: size * 3, height: size * 3, borderRadius: size * 1.5, opacity: alive ? glowOpacity : 0.06, transform: [{ scale }] }]}
      />
      <Animated.View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: alive ? colors.gold : colors.dim,
          transform: [{ scale: alive ? scale : 1 }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: colors.gold },
});
