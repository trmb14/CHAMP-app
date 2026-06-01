import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/colors';

const STATUS_COLORS = {
  pending: { bg: '#FFF3CD', text: '#856404' },
  approved: { bg: '#D1E7DD', text: '#0A5227' },
  invoiced: { bg: '#CCE5FF', text: '#0C5460' },
  draft: { bg: '#F8F9FA', text: '#495057' },
  sent: { bg: '#CCE5FF', text: '#0C5460' },
  paid: { bg: '#D1E7DD', text: '#0A5227' },
  open: { bg: '#D1E7DD', text: '#0A5227' },
  closed: { bg: '#F8D7DA', text: '#721C24' },
  active: { bg: '#D1E7DD', text: '#0A5227' },
  inactive: { bg: '#F8D7DA', text: '#721C24' },
};

export default function StatusBadge({ status, style }) {
  const colors = STATUS_COLORS[status?.toLowerCase()] || { bg: COLORS.lightBlue, text: COLORS.navy };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
