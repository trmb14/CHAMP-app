import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../services/api';
import { COLORS, SHADOWS } from '../../utils/colors';

export default function ClientProfileScreen() {
  const { user, logout } = useAuth();
  const [facilityName, setFacilityName] = useState(user?.client_facility || '—');
  const [facilityAddress, setFacilityAddress] = useState(null);

  useEffect(() => {
    dashboardAPI.client()
      .then(data => {
        if (data?.client?.name) setFacilityName(data.client.name);
        if (data?.client?.address) {
          const c = data.client;
          setFacilityAddress(`${c.address}, ${c.city}, ${c.province}`);
        }
      })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const rows = [
    { label: 'Name', value: user?.name, icon: 'person-outline' },
    { label: 'Email', value: user?.email, icon: 'mail-outline' },
    { label: 'Facility', value: facilityName, icon: 'business-outline' },
    { label: 'Address', value: facilityAddress, icon: 'location-outline', hide: !facilityAddress },
    { label: 'Role', value: 'Client Facility', icon: 'shield-outline' },
  ].filter(r => !r.hide);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{user?.name}</Text>
          <Text style={styles.avatarFacility}>{facilityName}</Text>
        </View>

        {/* Info rows */}
        <View style={[styles.infoCard, SHADOWS.card]}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={18} color={COLORS.navy} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value || '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contact CHAMP */}
        <View style={[styles.contactCard, SHADOWS.card]}>
          <Ionicons name="headset-outline" size={22} color={COLORS.navy} />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>CHAMP Health Care Services</Text>
            <Text style={styles.contactDetail}>920 Lesage Way, Orleans, ON</Text>
            <Text style={styles.contactDetail}>613-824-5065</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, SHADOWS.card]}
          onPress={() => Alert.alert('Sign Out', 'Sign out of CHAMP?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 28, fontWeight: '700' },
  avatarName: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  avatarFacility: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  infoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  contactCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactText: { flex: 1 },
  contactTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  contactDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  signOutBtn: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
});
