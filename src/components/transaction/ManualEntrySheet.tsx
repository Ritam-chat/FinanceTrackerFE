import React, { useState, useMemo, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Location from 'expo-location';
import { useTheme } from '../../hooks/useTheme';
import { ConfiguredBank, AppContext } from '../../context/AppContext';
import { saveManualRecord, addRecord } from '../../api/client';

interface Props {
  sheetRef: React.RefObject<BottomSheet | null>;
  configuredBanks: ConfiguredBank[];
  onSuccess: () => void;
}

export const ManualEntrySheet = ({ sheetRef, configuredBanks, onSuccess }: Props) => {
  const { colors } = useTheme();
  const context = useContext(AppContext);
  const categories = context?.state?.categories || ['Food & Dining', 'Shopping', 'Transportation', 'Travel', 'Bills & Utilities', 'Entertainment', 'Health & Wellness', 'Investments', 'Income', 'Transfers', 'Miscellaneous'];

  const [loading, setLoading] = useState(false);
  const [toFrom, setToFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Debit' | 'Credit'>('Debit');
  const [selectedBankId, setSelectedBankId] = useState(configuredBanks[0]?.id || '');
  const [category, setCategory] = useState(categories[0] || 'Miscellaneous');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gps, setGps] = useState('');
  const [entryMode, setEntryMode] = useState<'manual' | 'sms'>('manual');
  const [smsAddress, setSmsAddress] = useState('');
  const [smsBody, setSmsBody] = useState('');

  const selectedBank = useMemo(() => 
    configuredBanks.find(b => b.id === selectedBankId), 
    [selectedBankId, configuredBanks]
  );

  React.useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        let location = await Location.getCurrentPositionAsync({});
        const coords = `${location.coords.latitude.toFixed(4)},${location.coords.longitude.toFixed(4)}`;
        setGps(coords);
      } catch (e) {
        console.warn('Failed to fetch location', e);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (entryMode === 'manual') {
        if (!toFrom.trim() || !amount.trim() || !selectedBankId) {
            Alert.alert('Error', 'Please fill in merchant, amount and select an account.');
            return;
        }

        setLoading(true);
        const success = await saveManualRecord({
            bank: selectedBank?.bankName || 'Unknown',
            account: selectedBank?.accountDigits || 'Manual',
            accountType: selectedBank?.accountType || 'Savings',
            amount: parseFloat(amount),
            to_from: toFrom.trim(),
            type: type,
            category: category,
            tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
            date: date.toISOString()
        });

        setLoading(false);
        if (success) {
            onSuccess();
            resetAndClose();
        } else {
            Alert.alert('Error', 'Failed to save transaction');
        }
    } else {
        // SMS Mode
        if (!smsAddress.trim() || !smsBody.trim()) {
            Alert.alert('Error', 'Please provide Sender ID and SMS message.');
            return;
        }

        setLoading(true);
        // Format date as dd/MM/yy hh:mm AM/PM
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours24 = date.getHours();
        const ampm = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = hours24 % 12 || 12;
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formattedDate = `${day}/${month}/${year} ${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;

        const message = await addRecord({
            address: smsAddress.trim().toUpperCase(),
            body: smsBody.trim(),
            readable_date: formattedDate,
            tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
            gps: gps.trim() || undefined
        });

        setLoading(false);
        if (message.toLowerCase().includes('success') || message.toLowerCase().includes('skipped')) {
            onSuccess();
            resetAndClose();
        } else {
            Alert.alert('Error', message || 'Failed to process SMS');
        }
    }
  };

  const resetAndClose = () => {
    sheetRef.current?.close();
    setToFrom('');
    setAmount('');
    setTags('');
    setGps('');
    setSmsAddress('');
    setSmsBody('');
    setDate(new Date());
    setEntryMode('manual');
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['85%']}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>

        <View style={styles.modeToggle}>
            <TouchableOpacity 
                style={[styles.modeBtn, entryMode === 'manual' && { backgroundColor: colors.blue }]}
                onPress={() => setEntryMode('manual')}
            >
                <Text style={{ color: entryMode === 'manual' ? '#FFF' : colors.text, fontWeight: '600' }}>Structured</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.modeBtn, entryMode === 'sms' && { backgroundColor: colors.blue }]}
                onPress={() => setEntryMode('sms')}
            >
                <Text style={{ color: entryMode === 'sms' ? '#FFF' : colors.text, fontWeight: '600' }}>Raw SMS</Text>
            </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {entryMode === 'manual' ? (
                <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Merchant / Person</Text>
                    <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Amazon, Starbucks"
                    placeholderTextColor={colors.textSecondary}
                    value={toFrom}
                    onChangeText={setToFrom}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
                            <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textSecondary}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: 120 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, type === 'Debit' && { backgroundColor: colors.red }]} 
                                    onPress={() => setType('Debit')}
                                >
                                    <Text style={{ color: type === 'Debit' ? '#FFF' : colors.text, fontSize: 12 }}>Debit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, type === 'Credit' && { backgroundColor: colors.green }]} 
                                    onPress={() => setType('Credit')}
                                >
                                    <Text style={{ color: type === 'Credit' ? '#FFF' : colors.text, fontSize: 12 }}>Credit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.bankChip,
                                    { borderColor: colors.border },
                                    category === cat && { backgroundColor: colors.purple, borderColor: colors.purple }
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={{ color: category === cat ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Account</Text>
                    <View style={styles.bankPicker}>
                        {configuredBanks.map(bank => (
                            <TouchableOpacity 
                                key={bank.id} 
                                style={[
                                    styles.bankChip, 
                                    { borderColor: colors.border },
                                    selectedBankId === bank.id && { backgroundColor: colors.blue, borderColor: colors.blue }
                                ]}
                                onPress={() => setSelectedBankId(bank.id)}
                            >
                                <Text style={{ color: selectedBankId === bank.id ? '#FFF' : colors.text, fontSize: 13 }}>
                                    {bank.bankName} {bank.accountDigits ? `(••${bank.accountDigits})` : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ) : (
                <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Sender ID (Address)</Text>
                    <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. HDFCBK, KOTAKB, AXISBK"
                    placeholderTextColor={colors.textSecondary}
                    value={smsAddress}
                    onChangeText={setSmsAddress}
                    autoCapitalize="characters"
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Raw SMS Message</Text>
                    <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, height: 120, paddingTop: 12 }]}
                    placeholder="Paste the full SMS text here..."
                    placeholderTextColor={colors.textSecondary}
                    value={smsBody}
                    onChangeText={setSmsBody}
                    multiline
                    textAlignVertical="top"
                    />
                </>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Date & Time</Text>
                    <TouchableOpacity 
                        style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                </View>
                {entryMode === 'sms' && (
                    <View style={{ width: 140 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>GPS (Optional)</Text>
                        <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        placeholder="lat,lng"
                        placeholderTextColor={colors.textSecondary}
                        value={gps}
                        onChangeText={setGps}
                        />
                    </View>
                )}
            </View>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="datetime"
                date={date}
                onConfirm={(selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tags (comma separated)</Text>
            <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Food, Shopping, Travel"
            placeholderTextColor={colors.textSecondary}
            value={tags}
            onChangeText={setTags}
            />

            <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: colors.blue }]} 
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Transaction</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.1)',
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
