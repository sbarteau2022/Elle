// Her voice, honestly. The orb speaks her replies aloud (platform TTS via
// expo-speech) and glows while she talks. Microphone speech-to-text is a
// dev-build rung (Extension Ladder rung 1 — the PFAR path wants RAW audio
// features, not a transcript), so the orb does not pretend to listen yet:
// no fake mic, no dead button.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { colors } from '../theme';

export function useSpeakReplies() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const speak = (text: string) => {
    if (!enabled || !text) return;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text.slice(0, 3500), {
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const toggle = () => {
    if (speaking) Speech.stop();
    setSpeaking(false);
    setEnabled(e => !e);
  };

  useEffect(() => () => { Speech.stop(); }, []);
  return { enabled, speaking, speak, toggle };
}

export function VoiceOrb({ enabled, speaking, onToggle }: { enabled: boolean; speaking: boolean; onToggle: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!speaking) { pulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });

  return (
    <Pressable onPress={onToggle} hitSlop={10} accessibilityLabel={enabled ? 'Stop speaking replies' : 'Speak replies aloud'}>
      <Animated.View style={[styles.orb, enabled && styles.orbOn, { transform: [{ scale }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: colors.gold, backgroundColor: 'transparent',
  },
  orbOn: { backgroundColor: colors.gold },
});
