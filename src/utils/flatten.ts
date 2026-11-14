export interface ReceivableEntry {
  id: string;
  name: string;
  amount: number;
  status: 'pending' | 'received';
}

export interface SplitData {
  enabled: boolean;
  myShare: number;
  receivables: ReceivableEntry[];
}

export interface FlatTransaction {
  _key: string;       // e.g "HDFC~1234~timestamp"
  _docId: string;     // The raw timestamp key (used for precise date sorting)
  bank: string;
  account: string;

  type: 'Debit' | 'Credit';
  mode: string;
  accountType: 'Savings' | 'Credit Card';
  to_from: string;
  amount: string;
  refNo: string;
  time: string;
  tags: string[];
  category: string;
  gps: string;
  split?: SplitData;
}

export const flattenTransactions = (data: any): FlatTransaction[] => {
  if (!data || typeof data !== 'object') return [];

  const results: FlatTransaction[] = [];

  for (const bank of Object.keys(data)) {
    if (bank === 'Stash') continue;

    for (const account of Object.keys(data[bank] || {})) {
      for (const timestamp of Object.keys(data[bank][account] || {})) {
        const tx = data[bank][account][timestamp];
        results.push({
          _key: `${bank}~${account}~${timestamp}`,
          _docId: timestamp,
          bank,
          account,
          type: tx.type || 'Debit',
          mode: tx.mode || 'Unknown',
          accountType: tx.accountType || 'Savings',
          to_from: tx.to_from || '',
          amount: tx.amount || '0',
          refNo: tx.refNo || 'N/A',
          time: tx.time || '',
          tags: tx.tags || [],
          category: tx.category || (tx.tags && tx.tags.length > 0 ? tx.tags[0] : 'Uncategorized'),
          gps: tx.gps || '',
          split: tx.split,
        });
      }
    }
  }

  // Sort by docId (timestamp) descending
  return results.sort((a, b) => new Date(b._docId).getTime() - new Date(a._docId).getTime());
};
