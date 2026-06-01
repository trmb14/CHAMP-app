import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/colors';
import {
  isBiometricSupported, isBiometricEnabled, authenticate,
  saveCredentials, clearCredentials, getBiometricTypeName,
} from '../../services/biometric';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EmployeeProfileScreen() {
  const { user, logout } = useAuth();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const supported = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    setBiometricSupported(supported);
    setBiometricEnabled(enabled);
    if (supported) {
      const name = await getBiometricTypeName();
      setBiometricTypeName(name);
    }
  }

  async function toggleBiometric(value) {
    if (value) {
      // Enable: authenticate first, then ask for password to save
      const success = await authenticate(`Verify to enable ${biometricTypeName}`);
      if (!success) return;
      Alert.prompt(
        `Enable ${biometricTypeName}`,
        'Enter your password to save credentials securely.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async (pwd) => {
              if (!pwd) return;
              await saveCredentials(user.email, pwd);
              setBiometricEnabled(true);
              Alert.alert('Enabled', `${biometricTypeName} login is now active.`);
            }
          },
        ],
        'secure-text'
      );
    } else {
      Alert.alert(
        `Disable ${biometricTypeName}`,
        'This will remove saved credentials from this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable', style: 'destructive', onPress: async () => {
              await clearCredentials();
              setBiometricEnabled(false);
            }
          },
        ]
      );
    }
  }

  const rows = [
    { label: 'Name', value: user?.name, icon: 'person-outline' },
    { label: 'Email', value: user?.email, icon: 'mail-outline' },
    { label: 'Position', value: user?.position || '—', icon: 'briefcase-outline' },
    { label: 'Role', value: 'Employee', icon: 'shield-outline' },
  ];

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
          <Text style={styles.avatarSub}>{user?.position}</Text>
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

        {/* Security */}
        {biometricSupported && (
          <View style={[styles.securityCard, SHADOWS.card]}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Ionicons
                  name={biometricTypeName === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                  size={20}
                  color={COLORS.navy}
                />
                <View>
                  <Text style={styles.switchLabel}>{biometricTypeName}</Text>
                  <Text style={styles.switchSub}>Sign in without a password</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: COLORS.border, true: COLORS.navy + '60' }}
                thumbColor={biometricEnabled ? COLORS.navy : COLORS.textSecondary}
              />
            </View>
          </View>
        )}

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
  avatarSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
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
  securityCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  switchSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
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
