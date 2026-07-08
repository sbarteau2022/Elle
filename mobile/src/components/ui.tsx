// Shared primitives — hairline cards, labels, buttons. One place, so every
// surface keeps the same void-black/one-gold discipline.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { colors, fonts, hairline, space } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// The small caps mono label that names a data region.
export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Mono({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

export function Button({ title, onPress, danger, disabled }: { title: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, danger && styles.buttonDanger, (pressed || disabled) && { opacity: 0.55 }]}
    >
      <Text style={[styles.buttonText, danger && { color: colors.red }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, ...hairline, borderRadius: 10, padding: space(4) },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: colors.cream },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.mist },
  button: {
    ...hairline, borderColor: colors.gold, borderRadius: 8,
    paddingVertical: space(2.5), paddingHorizontal: space(4), alignItems: 'center',
  },
  buttonDanger: { borderColor: colors.red },
  buttonText: { fontFamily: fonts.bodyMedium, fontSize: 15, letterSpacing: 1, color: colors.gold, textTransform: 'uppercase' },
});
