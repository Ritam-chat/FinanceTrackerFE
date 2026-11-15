import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FlatTransaction, ReceivableEntry } from '../../utils/flatten';
import { useTheme } from '../../hooks/useTheme';
import { AppContext } from '../../context/AppContext';
import { formatAmount } from '../../utils/formatters';

interface SplitExpenseFlowProps {
  transaction: FlatTransaction;
  onClose: () => void;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

export const SplitExpenseFlow: React.FC<SplitExpenseFlowProps> = ({ transaction, onClose, bottomSheetRef }) => {
  const { colors } = useTheme();
  const { state: { transactions }, updateTransactionFields } = useContext(AppContext)!;
  
  const existingSplit = transaction.split;
  
  const [people, setPeople] = useState<string[]>(existingSplit?.receivables.map(r => r.name) || []);
  const [newName, setNewName] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  
  const totalAmount = parseFloat(transaction.amount);
  
  // Custom amounts mapping: name -> amount string
  const initCustom: Record<string, string> = {};
  if (existingSplit && existingSplit.receivables) {
    existingSplit.receivables.forEach(r => {
       initCustom[r.name] = r.amount.toString();
    });
  }
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(initCustom);
  const [myCustomShare, setMyCustomShare] = useState<string>(existingSplit?.myShare.toString() || '');

  const [isSaving, setIsSaving] = useState(false);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const topUsers = React.useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(tx => {
      if (new Date(tx._docId).getTime() > thirtyDaysAgo && tx.split?.enabled) {
        tx.split.receivables.forEach(r => {
          counts[r.name] = (counts[r.name] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }, [transactions]);

  const handleAddPerson = () => {
    if (newName.trim() && !people.includes(newName.trim())) {
      setPeople([...people, newName.trim()]);
    }
    setNewName('');
  };

  const handleRemovePerson = (name: string) => {
    setPeople(people.filter(p => p !== name));
  };

  const handleSave = async () => {
    if (people.length === 0) {
      Alert.alert('Error', 'Add at least one person to split with.');
      return;
    }

    let myShare = 0;
    const receivables: ReceivableEntry[] = [];

    if (splitType === 'equal') {
      const share = totalAmount / (people.length + 1);
      myShare = share;
      people.forEach(p => {
        // preserve existing status if any
        const existing = existingSplit?.receivables.find(r => r.name === p);
        receivables.push({
          id: existing ? existing.id : Math.random().toString(36).substring(7),
          name: p,
          amount: parseFloat(share.toFixed(2)),
          status: existing ? existing.status : 'pending'
        });
      });
    } else {
      myShare = parseFloat(myCustomShare) || 0;
      let sum = myShare;
      people.forEach(p => {
        const amt = parseFloat(customAmounts[p]) || 0;
        sum += amt;
        const existing = existingSplit?.receivables.find(r => r.name === p);
        if (amt > 0) {
          receivables.push({
            id: existing ? existing.id : Math.random().toString(36).substring(7),
            name: p,
            amount: amt,
            status: existing ? existing.status : 'pending'
          });
        }
      });
      // Allow minor float differences e.g. 0.01
      if (Math.abs(sum - totalAmount) > 0.1) {
        Alert.alert('Error', `Amounts don't add up to total ${totalAmount}`);
        return;
      }
    }

    setIsSaving(true);
    const splitObj = { enabled: true, myShare: parseFloat(myShare.toFixed(2)), receivables };
    const success = await updateTransactionFields(transaction._key, { split: splitObj });
    setIsSaving(false);
    
    if (success) {
      bottomSheetRef.current?.close();
    } else {
      Alert.alert('Error', 'Failed to save split');
    }
  };

  const handleRemoveSplit = async () => {
    setIsSaving(true);
    const success = await updateTransactionFields(transaction._key, { split: { enabled: false, myShare: parseFloat(transaction.amount), receivables: [] } });
    setIsSaving(false);
    if (success) bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['85%']}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onClose} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.blue, fontSize: 16 }}>← Back to Details</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Split Expense</Text>
        <Text style={[styles.amount, { color: colors.textSecondary }]}>Total: {formatAmount(totalAmount.toString())}</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Who are you splitting with?</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAddPerson}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.purple }]} onPress={handleAddPerson}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Add</Text>
          </TouchableOpacity>
        </View>

        {topUsers.filter(u => !people.includes(u)).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {topUsers.filter(u => !people.includes(u)).map(u => (
              <TouchableOpacity key={u} style={[styles.suggestedChip, { borderColor: colors.border }]} onPress={() => setPeople([...people, u])}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>+ {u}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.peopleList}>
          {people.map(p => (
            <View key={p} style={[styles.personChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ color: colors.text }}>{p}</Text>
              <TouchableOpacity onPress={() => handleRemovePerson(p)}>
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {people.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', marginTop: 24, marginBottom: 16 }}>
              <TouchableOpacity 
                style={[styles.toggleBtn, { backgroundColor: splitType === 'equal' ? colors.purple : colors.surfaceAlt }]}
                onPress={() => setSplitType('equal')}>
                <Text style={{ color: splitType === 'equal' ? '#FFF' : colors.text }}>Equal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                 style={[styles.toggleBtn, { backgroundColor: splitType === 'custom' ? colors.purple : colors.surfaceAlt, marginLeft: 8 }]}
                 onPress={() => setSplitType('custom')}>
                <Text style={{ color: splitType === 'custom' ? '#FFF' : colors.text }}>Custom</Text>
              </TouchableOpacity>
            </View>

            {splitType === 'equal' ? (
              <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={{ color: colors.text, fontSize: 16 }}>Each person owes: <Text style={{ fontWeight: '700' }}>{formatAmount((totalAmount / (people.length + 1)).toString())}</Text></Text>
              </View>
            ) : (
              <View>
                <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>My Share</Text>
                  <TextInput
                    style={[styles.input, { width: 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                    value={myCustomShare}
                    onChangeText={setMyCustomShare}
                  />
                </View>
                {people.map(p => (
                   <View key={p} style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                     <Text style={{ color: colors.text, fontSize: 16 }}>{p} owes</Text>
                     <TextInput
                       style={[styles.input, { width: 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                       placeholder="0.00"
                       keyboardType="numeric"
                       placeholderTextColor={colors.textSecondary}
                       value={customAmounts[p] || ''}
                       onChangeText={(val) => {
                         setCustomAmounts(prev => {
                           const newAmounts = { ...prev, [p]: val };
                           let sum = 0;
                           people.forEach(person => {
                             sum += parseFloat(newAmounts[person]) || 0;
                           });
                           const remainder = Math.max(0, totalAmount - sum);
                           setMyCustomShare(remainder.toFixed(2));
                           return newAmounts;
                         });
                       }}
                     />
                   </View>
                ))}
              </View>
            )}
          </>
        )}

        <TouchableOpacity 
           style={[styles.saveBtn, { backgroundColor: colors.purple, opacity: isSaving ? 0.7 : 1, marginTop: 32 }]} 
           onPress={handleSave}
           disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Confirm Split"}</Text>
        </TouchableOpacity>

        {existingSplit?.enabled && (
           <TouchableOpacity 
             style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.red, marginTop: 16 }]} 
             onPress={handleRemoveSplit}
             disabled={isSaving}
           >
             <Text style={[styles.saveBtnText, { color: colors.red }]}>Remove Split</Text>
           </TouchableOpacity>
        )}

      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  peopleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  suggestedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
  },
  saveBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
