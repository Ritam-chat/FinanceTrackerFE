import React, { useContext, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { AppContext } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const FilterBar = () => {
  const { colors } = useTheme();
  const context = useContext(AppContext)!;
  const { state: { filters, configuredBanks, transactions }, dispatch } = context;

  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(filters.customStartDate ? new Date(filters.customStartDate) : new Date());
  const [tempEndDate, setTempEndDate] = useState(filters.customEndDate ? new Date(filters.customEndDate) : new Date());
  
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);

  const toggleIgnore = () => {
    dispatch({ type: 'SET_FILTER', payload: { showIgnore: !filters.showIgnore } });
  };

  const toggleCCRepay = () => {
    dispatch({ type: 'SET_FILTER', payload: { showCCRepayment: !filters.showCCRepayment } });
  };

  const filterOptions = useMemo(() => {
    if (configuredBanks.length > 0) {
      return configuredBanks.map(b => ({
        id: b.id,
        label: b.accountDigits ? `${b.bankName} ${b.accountDigits}` : b.bankName,
        bank: b.bankName,
        account: b.accountDigits || null
      }));
    }
    const uniqueBanks = Array.from(new Set(transactions.map(t => t.bank)));
    return uniqueBanks.map(b => ({ id: b, label: b, bank: b, account: null }));
  }, [configuredBanks, transactions]);

  const setFilterOption = (bank: string | null, account: string | null) => {
    dispatch({ type: 'SET_FILTER', payload: { bank, account } });
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity 
          style={[styles.chip, { backgroundColor: filters.bank === null ? colors.blue : colors.surfaceAlt }]} 
          onPress={() => setFilterOption(null, null)}>
          <Text style={{ color: filters.bank === null ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>All</Text>
        </TouchableOpacity>

        {filterOptions.map(opt => {
          const isSelected = filters.bank === opt.bank && filters.account === opt.account;
          return (
            <TouchableOpacity 
              key={opt.id}
              style={[styles.chip, { backgroundColor: isSelected ? colors.blue : colors.surfaceAlt }]} 
              onPress={() => setFilterOption(opt.bank, opt.account)}>
              <Text style={{ color: isSelected ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 8 }} />

        {[ {label: '30D', val: 30}, {label: '90D', val: 90}, {label: '1Y', val: 365}, {label: 'All Time', val: null}, {label: 'Custom', val: 'custom'} ].map(opt => (
          <TouchableOpacity 
            key={opt.label}
            style={[styles.chip, { backgroundColor: filters.dateRangeDays === opt.val ? colors.blue : colors.surfaceAlt }]} 
            onPress={() => {
              if (opt.val === 'custom') {
                setDateModalVisible(true);
              } else {
                dispatch({ type: 'SET_FILTER', payload: { dateRangeDays: opt.val as any } });
              }
            }}>
            <Text style={{ color: filters.dateRangeDays === opt.val ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>{opt.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 8 }} />

        <TouchableOpacity 
          style={[styles.chip, { backgroundColor: filters.showIgnore ? colors.red : colors.surfaceAlt }]} 
          onPress={toggleIgnore}>
          <MaterialCommunityIcons name="eye-off-outline" size={14} color={filters.showIgnore ? '#FFF' : colors.text} style={{ marginRight: 4 }}/>
          <Text style={{ color: filters.showIgnore ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>Ignored</Text>
        </TouchableOpacity>

        <TouchableOpacity 
           style={[styles.chip, { backgroundColor: filters.showCCRepayment ? colors.amber : colors.surfaceAlt }]} 
           onPress={toggleCCRepay}>
          <MaterialCommunityIcons name="credit-card-refund-outline" size={14} color={filters.showCCRepayment ? '#FFF' : colors.text} style={{ marginRight: 4 }}/>
          <Text style={{ color: filters.showCCRepayment ? '#FFF' : colors.text, fontSize: 13, fontWeight: '500' }}>CC Repay</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Custom Date Modal */}
      <Modal visible={dateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Date Range</Text>
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
            <TouchableOpacity 
              style={[styles.input, { color: colors.text, borderColor: colors.border, justifyContent: 'center' }]}
              onPress={() => setStartPickerVisible(true)}>
              <Text style={{ color: colors.text }}>{tempStartDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>End Date</Text>
            <TouchableOpacity 
              style={[styles.input, { color: colors.text, borderColor: colors.border, justifyContent: 'center' }]}
              onPress={() => setEndPickerVisible(true)}>
              <Text style={{ color: colors.text }}>{tempEndDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDateModalVisible(false)} style={styles.actionBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const s = tempStartDate.toISOString().split('T')[0];
                const e = tempEndDate.toISOString().split('T')[0];
                dispatch({ type: 'SET_FILTER', payload: { dateRangeDays: 'custom', customStartDate: s, customEndDate: e } });
                setDateModalVisible(false);
              }} style={[styles.actionBtn, { backgroundColor: colors.blue, borderRadius: 6 }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
          <DateTimePickerModal
            isVisible={isStartPickerVisible}
            mode="date"
            date={tempStartDate}
            onConfirm={(date) => {
              setStartPickerVisible(false);
              setTempStartDate(date);
            }}
            onCancel={() => setStartPickerVisible(false)}
          />

          <DateTimePickerModal
            isVisible={isEndPickerVisible}
            mode="date"
            date={tempEndDate}
            onConfirm={(date) => {
              setEndPickerVisible(false);
              setTempEndDate(date);
            }}
            onCancel={() => setEndPickerVisible(false)}
          />
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 16,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  }
});
