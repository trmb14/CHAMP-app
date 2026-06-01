import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { clientsAPI } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatting';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { POSITIONS } from '../../utils/formatting';

export default function ClientDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId, isNew } = route.params || {};
  const { isSuperAdmin } = useAuth();

  const [client, setClient] = useState(null);
  const [rates, setRates] = useState([]);
  const [editMode, setEditMode] = useState(isNew || false);
  const [form, setForm] = useState({
    name: '', abbreviation: '', address: '', city: '',
    province: 'ON', postal_code: '', phone: '', fax: '',
    contact_name: '', email: '', billing_email: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [editRates, setEditRates] = useState(false);
  const [rateForm, setRateForm] = useState({});

  useEffect(() => {
    if (!isNew && clientId) load();
  }, []);

  async function load() {
    try {
      const data = await clientsAPI.get(clientId);
      setClient(data);
      setForm({
        name: data.name, abbreviation: data.abbreviation,
        address: data.address || '', city: data.city || '',
        province: data.province || 'ON', postal_code: data.postal_code || '',
        phone: data.phone || '', fax: data.fax || '',
        contact_name: data.contact_name || '', email: data.email || '',
        billing_email: data.billing_email || '',
      });
      const rateMap = {};
      (data.billing_rates || []).forEach(r => { rateMap[r.position] = String(r.rate); });
      setRateForm(rateMap);
      setRates(data.billing_rates || []);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name || !form.abbreviation) {
      return Alert.alert('Validation', 'Name and abbreviation are required');
    }
    setSaving(true);
    try {
      if (isNew) {
        await clientsAPI.create(form);
      } else {
        await clientsAPI.update(clientId, form);
      }
      if (isNew) navigation.goBack();
      else { setEditMode(false); load(); }
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  async function handleSaveRates() {
    try {
      const ratesArr = POSITIONS.map(pos => ({
        position: pos,
        rate: parseFloat(rateForm[pos] || 0),
      }));
      await clientsAPI.updateRates(clientId, ratesArr);
      setEditRates(false);
      load();
    } catch (err) { Alert.alert('Error', err.message); }
  }

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={isNew ? 'New Client' : client?.name || 'Client'}
        showBack
        rightAction={
          !isNew && !editMode ? (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Ionicons name="create-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {editMode || isNew ? (
            <>
              <Input label="Client Name *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Island View Retirement Residence" autoCapitalize="words" />
              <Input label="Abbreviation *" value={form.abbreviation} onChangeText={v => setForm(p => ({ ...p, abbreviation: v.toUpperCase() }))} placeholder="IS" autoCapitalize="characters" />
              <Input label="Address" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} placeholder="30 Jack Crescent" autoCapitalize="words" />
              <View style={styles.row}>
                <Input label="City" value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))} placeholder="Ottawa" autoCapitalize="words" style={{ flex: 1, marginRight: 8 }} />
                <Input label="Province" value={form.province} onChangeText={v => setForm(p => ({ ...p, province: v }))} placeholder="ON" style={{ width: 70 }} />
              </View>
              <Input label="Postal Code" value={form.postal_code} onChangeText={v => setForm(p => ({ ...p, postal_code: v }))} placeholder="K1B 3J7" autoCapitalize="characters" />
              <Input label="Phone" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="613-622-0002" keyboardType="phone-pad" />
              <Input label="Fax" value={form.fax} onChangeText={v => setForm(p => ({ ...p, fax: v }))} placeholder="613-366-3271" keyboardType="phone-pad" />
              <Input label="Contact Name" value={form.contact_name} onChangeText={v => setForm(p => ({ ...p, contact_name: v }))} placeholder="Adriana" autoCapitalize="words" />
              <Input label="Email" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="client@example.com" keyboardType="email-address" />
              <Input label="Billing Email" value={form.billing_email} onChangeText={v => setForm(p => ({ ...p, billing_email: v }))} placeholder="billing@example.com" keyboardType="email-address" />

              <View style={styles.buttonRow}>
                {!isNew && <Button title="Cancel" variant="secondary" onPress={() => setEditMode(false)} style={{ flex: 1 }} />}
                <Button title={isNew ? 'Create Client' : 'Save Changes'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              {/* View mode */}
              <Card padding={16}>
                <InfoRow icon="business-outline" label="Name" value={client?.name} />
                <InfoRow icon="location-outline" label="Address" value={`${client?.address}, ${client?.city}, ${client?.province}`} />
                <InfoRow icon="call-outline" label="Phone" value={client?.phone} />
                {client?.fax && <InfoRow icon="print-outline" label="Fax" value={client?.fax} />}
                {client?.contact_name && <InfoRow icon="person-outline" label="Contact" value={client?.contact_name} />}
                {client?.email && <InfoRow icon="mail-outline" label="Email" value={client?.email} />}
                {client?.billing_email && <InfoRow icon="receipt-outline" label="Billing" value={client?.billing_email} />}
              </Card>

              {/* Billing Rates */}
              <View style={styles.ratesSection}>
                <View style={styles.ratesHeader}>
                  <Text style={styles.sectionTitle}>Billing Rates</Text>
                  {isSuperAdmin() && (
                    <TouchableOpacity onPress={() => setEditRates(!editRates)}>
                      <Text style={styles.editRatesBtn}>{editRates ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Card padding={0}>
                  {POSITIONS.map((pos, i) => {
                    const rate = rates.find(r => r.position === pos);
                    return (
                      <View key={pos} style={[styles.rateRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                        <Text style={styles.ratePos}>{pos}</Text>
                        {editRates ? (
                          <Input
                            value={rateForm[pos] || ''}
                            onChangeText={v => setRateForm(p => ({ ...p, [pos]: v }))}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            style={{ margin: 0, width: 100 }}
                            inputStyle={{ textAlign: 'right', fontSize: 14 }}
                          />
                        ) : (
                          <Text style={styles.rateVal}>{rate ? formatCurrency(rate.rate) + '/hr' : '—'}</Text>
                        )}
                      </View>
                    );
                  })}
                </Card>
                {editRates && (
                  <Button title="Save Rates" onPress={handleSaveRates} style={{ marginTop: 8 }} />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.navy} style={{ marginRight: 10, marginTop: 1 }} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flex: 1, backgroundColor: COLORS.lightGray },
  form: { padding: 16 },
  row: { flexDirection: 'row' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 24 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, width: 65, fontWeight: '500', marginTop: 1 },
  infoValue: { fontSize: 14, color: COLORS.text, flex: 1 },
  ratesSection: { marginTop: 8 },
  ratesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  editRatesBtn: { color: COLORS.navy, fontSize: 14, fontWeight: '600' },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ratePos: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  rateVal: { fontSize: 14, color: COLORS.green, fontWeight: '700' },
});
