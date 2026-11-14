import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useReceivables } from '../../src/hooks/useReceivables';
import { ReceivableGroup } from '../../src/components/receivables/ReceivableGroup';
import { EmptyState } from '../../src/components/ui/SkeletonRow';
import { formatAmount } from '../../src/utils/formatters';
import { FlatTransaction } from '../../src/utils/flatten';
import { TransactionDetailSheet } from '../../src/components/transaction/TransactionDetailSheet';

export default function ToReceiveScreen() {
  const { colors } = useTheme();
  const { groupedReceivables, totalPending } = useReceivables();
  const [filter, setFilter] = useState<'all' | 'pending' | 'received'>('pending');
  const [selectedTx, setSelectedTx] = useState<FlatTransaction | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const names = Object.keys(groupedReceivables);

  const filteredGroups = names.map(name => {
    let items = groupedReceivables[name];
    if (filter === 'pending') items = items.filter(i => i.status === 'pending');
    if (filter === 'received') items = items.filter(i => i.status === 'received');
    return { name, items };
  }).filter(group => group.items.length > 0);

  const handleViewTransaction = (tx: FlatTransaction) => {
    setSelectedTx(tx);
    setSheetKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>To Receive</Text>
      </View>

      <View style={[styles.statCard, { backgroundColor: colors.purple + '15' }]}>
        <Text style={[styles.statLabel, { color: colors.purple }]}>Total Pending</Text>
        <Text style={[styles.statAmount, { color: colors.purple }]}>{formatAmount(totalPending.toString())}</Text>
      </View>

      <View style={styles.segmentControl}>
        {(['all', 'pending', 'received'] as const).map(tab => (
          <TouchableOpacity
             key={tab}
             style={[styles.segmentBtn, { backgroundColor: filter === tab ? colors.surfaceAlt : 'transparent' }]}
             onPress={() => setFilter(tab)}>
            <Text style={{
              color: filter === tab ? colors.text : colors.textSecondary,
              fontWeight: filter === tab ? '600' : '400',
              textTransform: 'capitalize'
            }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
         {filteredGroups.length === 0 ? (
           <EmptyState message={`No ${filter === 'all' ? '' : filter} receivables found.`} />
         ) : (
           filteredGroups.map(group => (
             <ReceivableGroup
               key={group.name}
               name={group.name}
               items={group.items}
               onViewTransaction={handleViewTransaction}
             />
           ))
         )}
      </ScrollView>

      {selectedTx && (
        <TransactionDetailSheet
          key={`sheet-${sheetKey}`}
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  statCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  }
});
