import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/colors';

function SkeletonBox({ width, height, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: COLORS.border, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBox width={46} height={46} borderRadius={23} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="65%" height={14} />
        <SkeletonBox width="45%" height={10} />
      </View>
      <SkeletonBox width={60} height={22} borderRadius={10} />
    </View>
  );
}

export function SkeletonStatCard({ style }) {
  return (
    <View style={[styles.statCard, style]}>
      <SkeletonBox width={40} height={40} borderRadius={10} style={{ marginBottom: 10 }} />
      <SkeletonBox width="55%" height={22} style={{ marginBottom: 6 }} />
      <SkeletonBox width="75%" height={11} />
    </View>
  );
}

export function SkeletonListScreen({ count = 4 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={styles.list}>
      <View style={styles.statsRow}>
        <SkeletonStatCard style={{ flex: 1 }} />
        <SkeletonStatCard style={{ flex: 1 }} />
      </View>
      <View style={[styles.statsRow, { marginTop: 10 }]}>
        <SkeletonStatCard style={{ flex: 1 }} />
        <SkeletonStatCard style={{ flex: 1 }} />
      </View>
      <SkeletonBox width="40%" height={18} borderRadius={6} style={{ marginTop: 20, marginBottom: 12 }} />
      <SkeletonCard style={{ marginBottom: 8 }} />
      <SkeletonCard style={{ marginBottom: 8 }} />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
});
