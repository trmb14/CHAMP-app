import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { clientsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import ScreenHeader from '../../components/common/ScreenHeader';

const CLIENT_COLORS = { IS: '#FCE4D6', SGH: '#DDEBF7', QW: '#E2EFDA', BR: '#FFF2CC', AL: '#EDE7F6' };

export default function ClientsScreen() {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const data = await clientsAPI.list();
      setClients(data);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Clients" showBack rightAction={
        <TouchableOpacity onPress={() => navigation.navigate('ClientDetail', { isNew: true })}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      } />
      <FlatList
        data={clients}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.navy} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
            activeOpacity={0.8}
          >
            <View style={[styles.abbrevBox, { backgroundColor: CLIENT_COLORS[item.abbreviation] || COLORS.lightBlue }]}>
              <Text style={styles.abbrevText}>{item.abbreviation}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientAddr}>{item.city}, {item.province}</Text>
              <Text style={styles.clientPhone}>{item.phone}</Text>
            </View>
            <View style={styles.right}>
              <View style={[styles.activeDot, { backgroundColor: item.is_active ? COLORS.green : COLORS.error }]} />
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} style={{ marginTop: 6 }} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  abbrevBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  abbrevText: { fontSize: 14, fontWeight: '800', color: COLORS.navy },
  info: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  clientAddr: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  clientPhone: { fontSize: 12, color: COLORS.navy, fontWeight: '500' },
  right: { alignItems: 'center' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
});
