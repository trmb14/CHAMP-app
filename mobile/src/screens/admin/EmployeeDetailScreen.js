import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usersAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatting';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

export default function EmployeeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { employeeId } = route.params;
  const { isSuperAdmin } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [emp, empShifts] = await Promise.all([
        usersAPI.get(employeeId),
        usersAPI.shifts(employeeId),
      ]);
      setEmployee(emp);
      setShifts(empShifts.slice(0, 20));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    Alert.alert(
      employee.is_active ? 'Deactivate Employee' : 'Activate Employee',
      `${employee.is_active ? 'Deactivate' : 'Activate'} ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            try {
              await usersAPI.update(employeeId, { is_active: !employee.is_active });
              load();
            } catch (err) { Alert.alert('Error', err.message); }
          }
        },
      ]
    );
  }

  if (loading) return <LoadingScreen />;
  if (!employee) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={employee.name}
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEmployee', { employeeId })}
          >
            <Ionicons name="create-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.name}>{employee.name}</Text>
          <Text style={styles.role}>{employee.position} • {employee.role}</Text>
          <StatusBadge status={employee.is_active ? 'active' : 'inactive'} style={{ marginTop: 8 }} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{formatCurrency(employee.pay_rate)}/hr</Text>
              <Text style={styles.statLabel}>Pay Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{shifts.length}</Text>
              <Text style={styles.statLabel}>Recent Shifts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{shifts.filter(s => s.status === 'approved').length}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Card padding={16}>
            <InfoRow icon="mail-outline" label="Email" value={employee.email} />
            <InfoRow icon="call-outline" label="Phone" value={employee.phone || 'Not set'} />
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Card padding={0}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('AddEmployee', { employeeId })}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.navy} />
              <Text style={styles.actionText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
            {isSuperAdmin() && (
              <TouchableOpacity style={[styles.actionRow, { borderTopWidth: 1, borderTopColor: COLORS.border }]} onPress={handleToggleActive}>
                <Ionicons name={employee.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'} size={20} color={employee.is_active ? COLORS.error : COLORS.green} />
                <Text style={[styles.actionText, { color: employee.is_active ? COLORS.error : COLORS.green }]}>
                  {employee.is_active ? 'Deactivate' : 'Activate'} Employee
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Recent shifts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Shifts ({shifts.length})</Text>
          {shifts.length > 0 ? shifts.map(shift => (
            <Card key={shift.id} padding={12} style={{ marginBottom: 8 }}>
              <View style={styles.shiftRow}>
                <View>
                  <Text style={styles.shiftDate}>{formatDate(shift.shift_date)}</Text>
                  <Text style={styles.shiftDetail}>
                    {shift.client_name} • {shift.position}
                  </Text>
                  <Text style={styles.shiftTime}>{formatTime(shift.time_in)} – {formatTime(shift.time_out)}</Text>
                </View>
                <StatusBadge status={shift.status} />
              </View>
            </Card>
          )) : (
            <Text style={styles.emptyText}>No shift history</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.navy} style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  profileCard: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    padding: 24,
    paddingBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: '700' },
  name: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  role: { color: '#A8C4E0', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statVal: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  statLabel: { color: '#A8C4E0', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, width: 60, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.text, flex: 1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shiftDate: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  shiftDetail: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 2 },
  shiftTime: { fontSize: 12, color: COLORS.navy, fontWeight: '500' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
});
