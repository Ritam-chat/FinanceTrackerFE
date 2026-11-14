import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';

export interface EnrichedReceivable {
  id: string;
  name: string;
  amount: number;
  status: 'pending' | 'received';
  transactionKey: string;
  to_from: string;
  date: string;
}

export const useReceivables = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useReceivables must be used within AppProvider');

  const { state: { transactions } } = context;

  const { receivables, totalPending } = useMemo(() => {
    const list: EnrichedReceivable[] = [];
    let pendingSum = 0;

    transactions.forEach(tx => {
      if (tx.split?.enabled && tx.split.receivables) {
        tx.split.receivables.forEach(rec => {
          list.push({
            ...rec,
            transactionKey: tx._key,
            to_from: tx.to_from,
            date: tx._docId,
          });
          if (rec.status === 'pending') {
            pendingSum += rec.amount;
          }
        });
      }
    });

    return {
      receivables: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalPending: pendingSum,
    };
  }, [transactions]);

  // Group by person
  const groupedReceivables = useMemo(() => {
    const groups: Record<string, EnrichedReceivable[]> = {};
    receivables.forEach(rec => {
      if (!groups[rec.name]) groups[rec.name] = [];
      groups[rec.name].push(rec);
    });
    return groups;
  }, [receivables]);

  return {
    receivables,
    groupedReceivables,
    totalPending,
  };
};
