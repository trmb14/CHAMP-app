import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../utils/colors';

export default function Card({ children, style, onPress, padding = 16 }) {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      style={[styles.card, { padding }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.card,
    marginBottom: 12,
  },
});
