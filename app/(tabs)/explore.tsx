import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { AppContext } from '../../src/context/AppContext';
import { useTransactions } from '../../src/hooks/useTransactions';
import { FilterBar } from '../../src/components/filter/FilterBar';
import { TransactionRow } from '../../src/components/transaction/TransactionRow';
import { TransactionDetailSheet } from '../../src/components/transaction/TransactionDetailSheet';
import { CategorizationRulesModal } from '../../src/components/ui/CategorizationRulesModal';
import { EmptyState } from '../../src/components/ui/SkeletonRow';
import { formatAmount } from '../../src/utils/formatters';
import { FlatTransaction } from '../../src/utils/flatten';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';

const CATEGORY_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#E7E9ED', '#86C7F3', '#F77062', '#25D366',
  '#E040FB', '#00E676', '#FF9100', '#D500F9', '#3D5AFE'
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { state: { spendType }, dispatch } = useContext(AppContext)!;
  const { filteredTransactions } = useTransactions();
  const { width } = useWindowDimensions();

  const [groupBy, setGroupBy] = useState<'category' | 'merchant' | 'tag'>('category');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<FlatTransaction | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Filter only Debit non-ignored expenses for breakdown
  const debitTransactions = useMemo(() => {
    return filteredTransactions.filter(tx => {
      if (tx.tags?.includes('Ignore')) return false;
      if (tx.tags?.includes('CC Repayment') || tx.mode === 'Repayment') return false;
      return tx.type === 'Debit';
    });
  }, [filteredTransactions]);

  const totalSpent = useMemo(() => {
    return debitTransactions.reduce((sum, tx) => {
      const amt = parseFloat(tx.amount) || 0;
      const actual = (spendType === 'my' && tx.split?.enabled) ? tx.split.myShare : amt;
      return sum + actual;
    }, 0);
  }, [debitTransactions, spendType]);

  // Group transactions by category / merchant / tag
  const groupedData = useMemo(() => {
    const groups: Record<string, { label: string; amount: number; count: number; txs: FlatTransaction[] }> = {};

    debitTransactions.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      const actual = (spendType === 'my' && tx.split?.enabled) ? tx.split.myShare : amt;

      let keys: string[] = [];
      if (groupBy === 'category') {
        keys = [tx.category || 'Uncategorized'];
      } else if (groupBy === 'merchant') {
        keys = [tx.to_from || tx.mode || 'Unknown'];
      } else {
        keys = tx.tags && tx.tags.length > 0 ? tx.tags : ['Untagged'];
      }

      keys.forEach(k => {
        if (!groups[k]) {
          groups[k] = { label: k, amount: 0, count: 0, txs: [] };
        }
        groups[k].amount += actual;
        groups[k].count += 1;
        groups[k].txs.push(tx);
      });
    });

    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [debitTransactions, groupBy, spendType]);

  // Donut chart data
  const pieData = useMemo(() => {
    if (totalSpent === 0) return [];
    return groupedData.slice(0, 6).map((group, index) => ({
      value: group.amount,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      text: `${Math.round((group.amount / totalSpent) * 100)}%`,
      focused: expandedGroup === group.label,
    }));
  }, [groupedData, totalSpent, expandedGroup]);

  // Bar chart trend data (last 7 date groups)
  const barData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    debitTransactions.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      const actual = (spendType === 'my' && tx.split?.enabled) ? tx.split.myShare : amt;
      const dayStr = tx._docId ? tx._docId.substring(0, 10) : 'Other';
      dailyMap[dayStr] = (dailyMap[dayStr] || 0) + actual;
    });

    const sortedDays = Object.keys(dailyMap).sort().slice(-7);
    return sortedDays.map((day, idx) => ({
      value: Math.round(dailyMap[day]),
      label: day.substring(5), // MM-DD
      frontColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [debitTransactions, spendType]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Analytics & Categorization</Text>
        </View>
        <TouchableOpacity
          style={[styles.rulesBtn, { backgroundColor: colors.purple + '15', borderColor: colors.purple }]}
          onPress={() => setShowRulesModal(true)}
        >
          <MaterialCommunityIcons name="cog-outline" size={18} color={colors.purple} />
          <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>Rules</Text>
        </TouchableOpacity>
      </View>

      {/* Spend Type Toggle */}
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

      {/* Global Filter Bar */}
      <FilterBar />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Total Summary */}
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Total {spendType === 'my' ? 'My' : ''} Spend in Filter
          </Text>
          <Text style={{ color: colors.red, fontSize: 32, fontWeight: '800', marginTop: 4 }}>
            {formatAmount(totalSpent.toString())}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Across {debitTransactions.length} transactions
          </Text>
        </View>

        {/* Donut Chart Visualization */}
        {totalSpent > 0 && pieData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Category Breakdown</Text>
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <PieChart
                data={pieData}
                donut
                sectionAutoFocus
                radius={85}
                innerRadius={55}
                innerCircleColor={colors.surface}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                      {groupedData.length}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Groups</Text>
                  </View>
                )}
              />
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              {groupedData.slice(0, 6).map((group, idx) => (
                <View key={group.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }]} />
                  <Text style={{ color: colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                    {group.label}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    {totalSpent > 0 ? `${Math.round((group.amount / totalSpent) * 100)}%` : '0%'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spending Trend Bar Chart */}
        {barData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Trend (Recent Days)</Text>
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <BarChart
                data={barData}
                barWidth={22}
                spacing={14}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                noOfSections={3}
                maxValue={Math.max(...barData.map(b => b.value), 1000) * 1.2}
              />
            </View>
          </View>
        )}

        {/* Group By Selector */}
        <View style={styles.groupHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Granular Breakdown</Text>
          <View style={[styles.groupByToggle, { backgroundColor: colors.surfaceAlt }]}>
            {(['category', 'merchant', 'tag'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.groupBtn, groupBy === tab && { backgroundColor: colors.surface }]}
                onPress={() => { setGroupBy(tab); setExpandedGroup(null); }}
              >
                <Text style={{
                  color: groupBy === tab ? colors.text : colors.textSecondary,
                  fontWeight: groupBy === tab ? '700' : '400',
                  fontSize: 12,
                  textTransform: 'capitalize'
                }}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Drill-down List */}
        {groupedData.length === 0 ? (
          <EmptyState message="No transactions found for selected filters" icon="chart-pie" />
        ) : (
          groupedData.map((group, idx) => {
            const isExpanded = expandedGroup === group.label;
            const pct = totalSpent > 0 ? Math.round((group.amount / totalSpent) * 100) : 0;
            const dotColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

            return (
              <View key={group.label} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.groupCardHeader}
                  onPress={() => setExpandedGroup(isExpanded ? null : group.label)}
                >
                  <View style={[styles.groupDot, { backgroundColor: dotColor }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{group.label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {group.count} transaction{group.count > 1 ? 's' : ''} • {pct}% of spend
                    </Text>
                  </View>
                  <Text style={[styles.groupAmount, { color: colors.red }]}>
                    {formatAmount(group.amount.toString())}
                  </Text>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.textSecondary}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {/* Expanded Transactions List */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    {group.txs.map(tx => (
                      <TransactionRow
                        key={tx._key}
                        transaction={tx}
                        onPress={() => {
                          setSelectedTx(tx);
                          setSheetKey(prev => prev + 1);
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Transaction Detail Sheet */}
      {selectedTx && (
        <TransactionDetailSheet
          key={`sheet-${sheetKey}`}
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* Rules Modal */}
      <CategorizationRulesModal
        visible={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rulesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
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
  },
  statBox: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  chartCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  groupByToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  groupBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
  },
  groupAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  expandedContent: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
