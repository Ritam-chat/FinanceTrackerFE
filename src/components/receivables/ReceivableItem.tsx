import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EnrichedReceivable } from '../../hooks/useReceivables';
import { useTheme } from '../../hooks/useTheme';
import { formatAmount, getDateLabel } from '../../utils/formatters';
import { AppContext } from '../../context/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ReceivableItemProps {
  item: EnrichedReceivable;
  onViewTransaction?: () => void;
}

export const ReceivableItem: React.FC<ReceivableItemProps> = ({ item, onViewTransaction }) => {
  const { colors } = useTheme();
  const { updateTransactionFields, state: { transactions } } = useContext(AppContext)!;

  const handleMarkReceived = async () => {
    const parentTx = transactions.find(t => t._key === item.transactionKey);
    if (!parentTx || !parentTx.split) return;

    const newReceivables = parentTx.split.receivables.map(r =>
      r.id === item.id ? { ...r, status: 'received' as const } : r
    );

    await updateTransactionFields(item.transactionKey, {
      split: { ...parentTx.split, receivables: newReceivables }
    });
  };

  const isPending = item.status === 'pending';
  const statusColor = isPending ? colors.amber : colors.green;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderLeftColor: statusColor }]}
      onPress={onViewTransaction}
      activeOpacity={onViewTransaction ? 0.7 : 1}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.amount, { color: colors.text }]}>{formatAmount(item.amount.toString())}</Text>
        <Text style={[styles.source, { color: colors.textSecondary }]}>
          {item.to_from} • {getDateLabel(item.date)}
        </Text>
      </View>
      <View style={styles.rightActions}>
        {isPending ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.green}15` }]}
            onPress={(e) => { e.stopPropagation?.(); handleMarkReceived(); }}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.green} style={{ marginRight: 4 }}/>
            <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>Mark Paid</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionBtn, { backgroundColor: `${colors.textSecondary}15` }]}>
            <MaterialCommunityIcons name="check-all" size={18} color={colors.textSecondary} style={{ marginRight: 4 }}/>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Received</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  source: {
    fontSize: 13,
  },
  rightActions: {
    marginLeft: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  }
});
