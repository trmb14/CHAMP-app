import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/colors';

export default function ChampLogo({ size = 'medium', inverted = false }) {
  const scale = size === 'large' ? 1.6 : size === 'small' ? 0.7 : 1;
  const textColor = inverted ? COLORS.navy : COLORS.white;
  const bgColor = inverted ? COLORS.white : COLORS.navy;

  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={[styles.logoBox, { backgroundColor: bgColor }]}>
        <View style={styles.textRow}>
          <Text style={[styles.champText, { color: textColor }]}>CHAMP</Text>
          <View style={styles.crossContainer}>
            <View style={[styles.crossV, { backgroundColor: COLORS.green }]} />
            <View style={[styles.crossH, { backgroundColor: COLORS.green }]} />
          </View>
        </View>
        <Text style={[styles.subtitle, { color: inverted ? COLORS.textSecondary : '#A8C4E0' }]}>
          HEALTH CARE SERVICES
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  champText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
  },
  crossContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossV: {
    position: 'absolute',
    width: 5,
    height: 16,
    borderRadius: 2,
  },
  crossH: {
    position: 'absolute',
    width: 16,
    height: 5,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '500',
  },
});
