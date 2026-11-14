import { FlatTransaction } from './flatten';

export const getStatementPeriod = (statementDay: number): { from: Date; to: Date } => {
  const today = new Date();
  const currentDay = today.getDate();
  
  let from = new Date(today.getFullYear(), today.getMonth(), statementDay);
  let to = new Date(today.getFullYear(), today.getMonth() + 1, statementDay - 1);

  if (currentDay < statementDay) {
    from = new Date(today.getFullYear(), today.getMonth() - 1, statementDay);
    to = new Date(today.getFullYear(), today.getMonth(), statementDay - 1);
  }

  // Set times
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return { from, to };
};

export const filterTxForPeriod = (
  txs: FlatTransaction[],
  from: Date,
  to: Date,
  bank: string,
  account: string
): FlatTransaction[] => {
  return txs.filter(tx => {
    if (tx.bank !== bank || tx.account !== account) return false;
    if (tx.type !== 'Debit') return false;
    
    // Ignore CC repayments and manually ignored
    if (tx.tags.includes('Ignore') || tx.tags.includes('CC Repayment') || tx.mode === 'Repayment') return false;

    const txDate = new Date(tx._docId);
    return txDate >= from && txDate <= to;
  });
};
