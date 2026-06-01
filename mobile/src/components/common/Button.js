import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOWS } from '../../utils/colors';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) {
  const variantStyles = {
    primary: { bg: COLORS.navy, text: COLORS.white, border: COLORS.navy },
    secondary: { bg: COLORS.white, text: COLORS.navy, border: COLORS.navy },
    success: { bg: COLORS.green, text: COLORS.white, border: COLORS.green },
    danger: { bg: COLORS.error, text: COLORS.white, border: COLORS.error },
    ghost: { bg: 'transparent', text: COLORS.navy, border: 'transparent' },
  };

  const sizeStyles = {
    small: { paddingH: 12, paddingV: 8, fontSize: 13, radius: 8 },
    medium: { paddingH: 20, paddingV: 12, fontSize: 15, radius: 10 },
    large: { paddingH: 24, paddingV: 16, fontSize: 16, radius: 12 },
  };

  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.medium;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderRadius: s.radius,
          opacity: disabled || loading ? 0.6 : 1,
        },
        variant === 'primary' && SHADOWS.button,
        style,
      ]}
      onPress={() => {
        if (!disabled && !loading) {
          Haptics.impactAsync(
            variant === 'danger'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : Haptics.ImpactFeedbackStyle.Light
          ).catch(() => {});
          onPress?.();
        }
      }}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  icon: {
    marginRight: 4,
  },
});
