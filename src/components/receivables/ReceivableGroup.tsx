import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { EnrichedReceivable } from '../../hooks/useReceivables';
import { ReceivableItem } from './ReceivableItem';
import { formatAmount } from '../../utils/formatters';
import { AppContext } from '../../context/AppContext';
import { FlatTransaction } from '../../utils/flatten';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ReceivableGroupProps {
  name: string;
  items: EnrichedReceivable[];
  onViewTransaction: (tx: FlatTransaction) => void;
}

export const ReceivableGroup: React.FC<ReceivableGroupProps> = ({ name, items, onViewTransaction }) => {
  const { colors } = useTheme();
  const { state: { transactions }, updateTransactionFields } = useContext(AppContext)!;

  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [clearAmountStr, setClearAmountStr] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const pendingItems = items.filter(i => i.status === 'pending');
  const totalOwed = pendingItems.reduce((sum, item) => sum + item.amount, 0);

  const handleClearAmount = async () => {
    const targetAmount = parseFloat(clearAmountStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to clear.');
      return;
    }
    if (targetAmount > totalOwed) {
      Alert.alert('Too Much', `Max pending amount is ${formatAmount(totalOwed.toString())}`);
      return;
    }

    setIsClearing(true);
    // Sort pending items oldest first (smallest date = oldest)
    const sortedPending = [...pendingItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remaining = targetAmount;
    const toMark: EnrichedReceivable[] = [];

    for (const item of sortedPending) {
      if (remaining <= 0) break;
      if (item.amount <= remaining) {
        toMark.push(item);
        remaining -= item.amount;
      }
    }

    // Group items by their parent transaction
    const byTx: Record<string, string[]> = {};
    toMark.forEach(item => {
      if (!byTx[item.transactionKey]) byTx[item.transactionKey] = [];
      byTx[item.transactionKey].push(item.id);
    });

    // Update each parent transaction
    for (const [txKey, itemIds] of Object.entries(byTx)) {
      const parentTx = transactions.find(t => t._key === txKey);
      if (!parentTx?.split) continue;
      const newReceivables = parentTx.split.receivables.map(r =>
        itemIds.includes(r.id) ? { ...r, status: 'received' as const } : r
      );
      await updateTransactionFields(txKey, { split: { ...parentTx.split, receivables: newReceivables } });
    }

    setIsClearing(false);
    setClearModalVisible(false);
    setClearAmountStr('');

    const clearedTotal = targetAmount - remaining;
    if (remaining > 0.01) {
      Alert.alert(
        'Partially Cleared',
        `Cleared ${formatAmount(clearedTotal.toFixed(2))} across ${toMark.length} transactions.\n\nRemaining ₹${remaining.toFixed(2)} couldn't be matched to full transactions.`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {totalOwed > 0 && (
            <Text style={[styles.total, { color: colors.amber }]}>
              {formatAmount(totalOwed.toString())}
            </Text>
          )}
          {pendingItems.length > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: colors.purple + '20', borderColor: colors.purple }]}
              onPress={() => setClearModalVisible(true)}
            >
              <MaterialCommunityIcons name="cash-fast" size={14} color={colors.purple} />
              <Text style={{ color: colors.purple, fontWeight: '600', fontSize: 12, marginLeft: 4 }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Items */}
      <View>
        {items.map(item => {
          const parentTx = transactions.find(t => t._key === item.transactionKey);
          return (
            <ReceivableItem
              key={item.id}
              item={item}
              onViewTransaction={parentTx ? () => onViewTransaction(parentTx) : undefined}
            />
          );
        })}
      </View>

      {/* Clear Amount Modal */}
      <Modal visible={clearModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Clear Amount for {name}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Total pending: {formatAmount(totalOwed.toString())} across {pendingItems.length} transactions
            </Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Amount to clear (e.g. 1500)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={clearAmountStr}
              onChangeText={setClearAmountStr}
              autoFocus
            />

            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>
              Oldest transactions will be cleared first until the amount is matched.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderWidth: 1, borderColor: colors.border }]}
                onPress={() => { setClearModalVisible(false); setClearAmountStr(''); }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.purple }]}
                onPress={handleClearAmount}
                disabled={isClearing}
              >
                {isClearing
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={{ color: '#FFF', fontWeight: '700' }}>Clear</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
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
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 20,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
