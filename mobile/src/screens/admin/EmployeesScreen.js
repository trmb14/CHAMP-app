import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usersAPI } from '../../services/api';
import { usePending } from '../../context/PendingContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, SHADOWS } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatting';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingScreen from '../../components/common/LoadingScreen';

const POSITION_COLORS = {
  PSW:  { bg: '#E8F5E9', text: '#2E7D32' },
  RPN:  { bg: '#E3F2FD', text: '#1565C0' },
  HSKP: { bg: '#FFF3E0', text: '#E65100' },
  UCP:  { bg: '#F3E5F5', text: '#6A1B9A' },
  SRV:  { bg: '#FCE4EC', text: '#880E4F' },
};

export default function EmployeesScreen() {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const { refresh: refreshPending } = usePending();

  const [employees, setEmployees] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const [empData, pendingData] = await Promise.all([
        usersAPI.list({ role: 'employee' }),
        usersAPI.pending(),
      ]);
      setEmployees(empData);
      setFiltered(empData);
      setPendingUsers(Array.isArray(pendingData) ? pendingData : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    ));
  }, [search, employees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await refreshPending();
    setRefreshing(false);
  }, []);

  async function handleApprove(user) {
    setApprovingId(user.id);
    try {
      await usersAPI.approve(user.id);
      await load();
      await refreshPending();
      Alert.alert('Approved', `${user.name}'s account has been activated.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(user) {
    Alert.alert(
      'Reject Application',
      `Reject ${user.name}'s application? They will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive', onPress: async () => {
            setRejectingId(user.id);
            try {
              await usersAPI.reject(user.id);
              await load();
              await refreshPending();
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setRejectingId(null);
            }
          }
        },
      ]
    );
  }

  if (loading && employees.length === 0) return <LoadingScreen />;

  const tabs = [
    { key: 'employees', label: 'Employees' },
    { key: 'pending', label: 'Pending', count: pendingUsers.length },
    { key: 'clients', label: 'Clients' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navy }]}>
        <View style={styles.headerTabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                if (tab.key === 'clients') {
                  setActiveTab('clients');
                  navigation.navigate('Clients');
                } else {
                  setActiveTab(tab.key);
                }
              }}
            >
              <View style={styles.tabInner}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab !== 'pending' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddEmployee')}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Employees tab */}
      {activeTab === 'employees' && (
        <>
          <View style={[styles.searchBar, { backgroundColor: colors.card || colors.white, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search employees..."
              placeholderTextColor={colors.textSecondary}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </Text>

          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
            renderItem={({ item }) => {
              const posColors = POSITION_COLORS[item.position] || { bg: COLORS.lightBlue, text: COLORS.navy };
              return (
                <TouchableOpacity
                  style={[styles.card, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}
                  onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.id })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
                    <Text style={styles.avatarText}>
                      {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <View style={styles.badges}>
                      <View style={[styles.posBadge, { backgroundColor: isDark ? colors.border : posColors.bg }]}>
                        <Text style={[styles.posText, { color: isDark ? colors.text : posColors.text }]}>
                          {item.position}
                        </Text>
                      </View>
                      <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
                    </View>
                    <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                    <Text style={[styles.rate, { color: COLORS.green }]}>{formatCurrency(item.pay_rate)}/hr</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No employees found</Text>
              </View>
            }
          />
        </>
      )}

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <FlatList
          data={pendingUsers}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
          renderItem={({ item }) => (
            <View style={[styles.pendingCard, { backgroundColor: colors.card || colors.white }, SHADOWS.card]}>
              <View style={[styles.avatar, { backgroundColor: colors.navy, marginRight: 12 }]}>
                <Text style={styles.avatarText}>
                  {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
                {item.position && (
                  <Text style={[styles.email, { color: colors.textSecondary }]}>
                    Position: {item.position}
                  </Text>
                )}
                {item.client_facility && (
                  <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                    Facility: {item.client_facility}
                  </Text>
                )}
                <Text style={[styles.roleTag, { color: colors.textSecondary }]}>
                  Role: {item.role}
                </Text>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.approveBtn, approvingId === item.id && styles.actionBtnDisabled]}
                  onPress={() => handleApprove(item)}
                  disabled={!!approvingId || !!rejectingId}
                >
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, rejectingId === item.id && styles.actionBtnDisabled]}
                  onPress={() => handleReject(item)}
                  disabled={!!approvingId || !!rejectingId}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListHeaderComponent={
            pendingUsers.length > 0 ? (
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
                {pendingUsers.length} pending application{pendingUsers.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending applications</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerTabs: { flex: 1, flexDirection: 'row', gap: 4 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { color: '#A8C4E0', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: COLORS.white },
  tabBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  addBtn: {
    backgroundColor: COLORS.green,
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  countText: { fontSize: 12, marginHorizontal: 20, marginTop: 6, marginBottom: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  card: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  pendingCard: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  badges: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  posText: { fontSize: 11, fontWeight: '700' },
  email: { fontSize: 12, marginBottom: 2, color: COLORS.textSecondary },
  rate: { fontSize: 13, fontWeight: '600' },
  roleTag: { fontSize: 11, marginTop: 2 },
  pendingActions: { flexDirection: 'column', gap: 6 },
  approveBtn: {
    backgroundColor: COLORS.green,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15 },
});
