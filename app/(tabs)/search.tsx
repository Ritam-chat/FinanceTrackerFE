import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { AppContext } from '../../src/context/AppContext';
import { TransactionRow } from '../../src/components/transaction/TransactionRow';
import { EmptyState } from '../../src/components/ui/SkeletonRow';
import { TransactionDetailSheet } from '../../src/components/transaction/TransactionDetailSheet';
import { FlatTransaction } from '../../src/utils/flatten';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatAmount } from '../../src/utils/formatters';
import { FilterBar } from '../../src/components/filter/FilterBar';
import { useTransactions } from '../../src/hooks/useTransactions';

export default function SearchScreen() {
  const { colors } = useTheme();
  const { state: { spendType }, dispatch } = useContext(AppContext)!;
  const { filteredTransactions } = useTransactions();
  const [query, setQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<FlatTransaction | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];

    const lowerQ = query.toLowerCase();

    return filteredTransactions.filter(tx => {
      // Search in to_from
      if (tx.to_from?.toLowerCase().includes(lowerQ)) return true;
      // Search in mode
      if (tx.mode?.toLowerCase().includes(lowerQ)) return true;
      // Search in amount
      if (String(tx.amount).includes(lowerQ)) return true;
      // Search in Ref no
      if (tx.refNo?.toLowerCase().includes(lowerQ)) return true;
      // Search in tags
      if (tx.tags?.some(t => t.toLowerCase().includes(lowerQ))) return true;

      return false;
    });
  }, [query, filteredTransactions]);

  const { totalSpent, totalReceived } = useMemo(() => {
    let spent = 0;
    let received = 0;
    results.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      if (!tx.tags?.includes('Ignore')) {
        if (tx.type === 'Debit' && !tx.tags?.includes('CC Repayment') && tx.mode !== 'Repayment') {
           const actualSpend = (spendType === 'my' && tx.split?.enabled) ? tx.split.myShare : amount;
           spent += actualSpend;
        } else if (tx.type === 'Credit' && !tx.tags?.includes('Refund') && !tx.tags?.includes('CC Repayment')) {
           received += amount;
        }
      }
    });
    return { totalSpent: spent, totalReceived: received };
  }, [results, spendType]);



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
             <MaterialCommunityIcons 
               name="close-circle-outline" 
               size={20} 
               color={colors.textSecondary} 
               onPress={() => setQuery('')}
             />
          )}
        </View>
      </View>

      {/* SPEND TYPE TOGGLE */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity 
          style={[styles.toggleBtn, spendType === 'total' && { backgroundColor: colors.surface }]}
          onPress={() => dispatch({ type: 'SET_SPEND_TYPE', payload: 'total' })}
        >
          <Text style={[styles.toggleBtnText, { color: colors.text, fontWeight: spendType === 'total' ? '700' : '400' }]}>Total Spends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, spendType === 'my' && { backgroundColor: colors.surface }]}
          onPress={() => dispatch({ type: 'SET_SPEND_TYPE', payload: 'my' })}
        >
          <Text style={[styles.toggleBtnText, { color: colors.text, fontWeight: spendType === 'my' ? '700' : '400' }]}>My Spends</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER BAR */}
      <FilterBar />

      {query.trim().length >= 2 && results.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>{spendType === 'my' ? 'My Spent' : 'Total Spent'}</Text>
              <Text style={{ color: colors.red, fontSize: 18, fontWeight: '700' }}>{formatAmount(totalSpent.toString())}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Total Received</Text>
              <Text style={{ color: colors.green, fontSize: 18, fontWeight: '700' }}>{formatAmount(totalReceived.toString())}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {query.trim().length < 2 ? (
          <EmptyState message="Type at least 2 characters to search" icon="magnify" />
        ) : results.length === 0 ? (
          <EmptyState message={`No results found for "${query}"`} icon="flask-empty-outline" />
        ) : (
          results.map(tx => (
            <TransactionRow 
              key={tx._key} 
              transaction={tx} 
              onPress={() => {
                setSelectedTx(tx);
                setSheetKey(prev => prev + 1);
              }} 
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    height: '100%',
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnText: {
    fontSize: 14,
  }
});
