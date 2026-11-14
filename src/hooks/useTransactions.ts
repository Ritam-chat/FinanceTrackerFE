import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { FlatTransaction } from '../utils/flatten';
import { getDateLabel } from '../utils/formatters';

export const useTransactions = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useTransactions must be used within AppProvider');

  const { state: { transactions, filters, spendType } } = context;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filters.bank && tx.bank !== filters.bank) return false;
      if (filters.account && tx.account !== filters.account) return false;
      const isCCRepay = tx.tags.includes('CC Repayment') || tx.mode === 'Repayment';
      const isIgnored = tx.tags.includes('Ignore');

      if (!filters.showCCRepayment && isCCRepay) return false;
      if (!filters.showIgnore && isIgnored && !isCCRepay) return false;

      const txMs = new Date(tx._docId).getTime();

      if (filters.dateRangeDays === 'custom') {
        if (filters.customStartDate) {
          const startMs = new Date(filters.customStartDate).getTime();
          if (txMs < startMs) return false;
        }
        if (filters.customEndDate) {
          // Add 24h to include the end date fully
          const endMs = new Date(filters.customEndDate).getTime() + (24 * 60 * 60 * 1000) - 1;
          if (txMs > endMs) return false;
        }
      } else if (filters.dateRangeDays !== null) {
        const cutoffMs = Date.now() - (filters.dateRangeDays * 24 * 60 * 60 * 1000);
        if (txMs < cutoffMs) return false;
      }
      
      if (filters.tags.length > 0) {
        if (!filters.tags.some(tag => tx.tags.includes(tag))) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const { groupedByDate, currentMonthSpent, currentMonthReceived } = useMemo(() => {
    const grouped: Record<string, { dateLabel: string; txs: FlatTransaction[]; debitTotal: number; creditTotal: number }> = {};
    let spent = 0;
    let received = 0;

    const currentYearStr = new Date().getFullYear().toString();
    const currentMonthStr = new Date().getMonth().toString();

    filteredTransactions.forEach(tx => {
      // Grouping logic
      const dateLabel = getDateLabel(tx._docId);
      if (!grouped[dateLabel]) {
        grouped[dateLabel] = { dateLabel, txs: [], debitTotal: 0, creditTotal: 0 };
      }
      
      const amount = parseFloat(tx.amount) || 0;
      const actualSpend = (spendType === 'my' && tx.split?.enabled) ? tx.split.myShare : amount;

      grouped[dateLabel].txs.push(tx);
      
      if (tx.type === 'Debit') {
        grouped[dateLabel].debitTotal += actualSpend;
      } else {
        grouped[dateLabel].creditTotal += amount;
      }

      // Metrics calculation based on filtered set
      if (!tx.tags.includes('Ignore')) {
        if (tx.type === 'Debit' && !tx.tags.includes('CC Repayment') && tx.mode !== 'Repayment') {
          spent += actualSpend;
        } else if (tx.type === 'Credit' && !tx.tags.includes('Refund') && !tx.tags.includes('CC Repayment')) {
          received += amount;
        }
      }
    });

    return {
      groupedByDate: Object.values(grouped),
      currentMonthSpent: spent,
      currentMonthReceived: received,
    };
  }, [filteredTransactions, spendType]);

  const topTags30Days = useMemo(() => {
    const cutoffMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const tagCounts: Record<string, number> = {};

    transactions.forEach(tx => {
      const txMs = new Date(tx._docId).getTime();
      if (txMs >= cutoffMs && tx.tags) {
        tx.tags.forEach(tag => {
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [transactions]);

  return {
    filteredTransactions,
    groupedByDate,
    currentMonthSpent,
    currentMonthReceived,
    net: currentMonthReceived - currentMonthSpent,
    topTags30Days,
  };
};
