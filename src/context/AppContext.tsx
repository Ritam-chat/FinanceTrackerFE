import React, { createContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import { FlatTransaction } from '../utils/flatten';
import { fetchRecords, updateRecord, wakeUp, fetchSettings, updateSettings } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiUser } from '../api/client';
import { PREDEFINED_TAGS } from '../constants/tags';

export interface ConfiguredBank {
  id: string;
  bankName: string;
  accountDigits: string;
  accountType: 'Savings' | 'Credit Card';
  linkedCards?: Record<string, string>;
  statementDay?: number;
}

type FilterState = {
  bank: string | null;
  account: string | null;
  tags: string[];
  showIgnore: boolean;
  showCCRepayment: boolean;
  dateRangeDays: number | null | 'custom';
  customStartDate: string | null;
  customEndDate: string | null;
};

type AppState = {
  transactions: FlatTransaction[];
  configuredBanks: ConfiguredBank[];
  loadingAuth: boolean;
  loading: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  username: string | null;
  error: string | null;
  darkMode: boolean;
  filters: FilterState;
  customTags: string[];
  categories: string[];
  categorizationRules: Record<string, string>;
  spendType: 'total' | 'my';
};

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Travel',
  'Bills & Utilities',
  'Entertainment',
  'Health & Wellness',
  'Investments',
  'Income',
  'Transfers',
  'Miscellaneous',
];

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: FlatTransaction[] }
  | { type: 'SET_SETTINGS'; payload: any }
  | { type: 'UPDATE_TRANSACTION'; payload: { key: string; fields: any } }
  | { type: 'SET_DARK_MODE'; payload: boolean }
  | { type: 'SET_AUTH'; payload: { isAuthenticated: boolean; username: string | null } }
  | { type: 'SET_LOADING_AUTH'; payload: boolean }
  | { type: 'SET_SPEND_TYPE'; payload: 'total' | 'my' }
  | { type: 'SET_FILTER'; payload: Partial<FilterState> };

const initialState: AppState = {
  transactions: [],
  configuredBanks: [],
  loadingAuth: true,
  loading: false,
  isSyncing: false,
  isAuthenticated: false,
  username: null,
  error: null,
  darkMode: true,
  filters: {
    bank: null,
    account: null,
    tags: [],
    showIgnore: false,
    showCCRepayment: false,
    dateRangeDays: 30,
    customStartDate: null,
    customEndDate: null,
  },
  customTags: PREDEFINED_TAGS,
  categories: DEFAULT_CATEGORIES,
  categorizationRules: {},
  spendType: 'my',
};

const mergeAndSortRecords = (oldRecords: FlatTransaction[], newRecords: FlatTransaction[]): FlatTransaction[] => {
  const map = new Map<string, FlatTransaction>();
  oldRecords.forEach(r => map.set(r._key, r));
  newRecords.forEach(r => map.set(r._key, r));
  const merged = Array.from(map.values());
  return merged.sort((a, b) => new Date(b._docId).getTime() - new Date(a._docId).getTime());
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, loading: false, isSyncing: false, error: null };
    case 'SET_SETTINGS':
      return { 
        ...state, 
        configuredBanks: action.payload?.configuredBanks || [],
        customTags: action.payload?.customTags || PREDEFINED_TAGS,
        categories: action.payload?.categories || DEFAULT_CATEGORIES,
        categorizationRules: action.payload?.categorizationRules || {},
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((tx) =>
          tx._key === action.payload.key ? { ...tx, ...action.payload.fields } : tx
        ),
      };
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_AUTH':
      return { ...state, isAuthenticated: action.payload.isAuthenticated, username: action.payload.username, loadingAuth: false };
    case 'SET_LOADING_AUTH':
      return { ...state, loadingAuth: action.payload };
    case 'SET_SPEND_TYPE':
      return { ...state, spendType: action.payload };
    default:
      return state;
  }
};

type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refreshRecords: () => Promise<void>;
  updateTransactionFields: (key: string, fields: any) => Promise<boolean>;
  saveConfiguredBanks: (banks: ConfiguredBank[]) => Promise<boolean>;
  saveCustomTags: (tags: string[]) => Promise<boolean>;
  saveCategories: (categories: string[]) => Promise<boolean>;
  saveCategorizationRules: (rules: Record<string, string>) => Promise<boolean>;
  applyCategorizationRulesToPast: (startDate?: string, endDate?: string) => Promise<{ updatedCount: number }>;
  setAuthContext: (username: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshRecords = async () => {
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      let lastSync = 0;
      const cachedTime = await AsyncStorage.getItem('@records_last_sync');
      if (cachedTime) {
          lastSync = parseInt(cachedTime, 10);
      } else {
          // If no cache, fetch last 90 days
          lastSync = Date.now() - (90 * 24 * 60 * 60 * 1000);
      }

      const records = await fetchRecords(lastSync);
      if (records.length > 0) {
         // Merge and sort
         const stateRecords = stateRef.current.transactions;
         const newMerged = mergeAndSortRecords(stateRecords, records);
         dispatch({ type: 'SET_TRANSACTIONS', payload: newMerged });
         try {
           await AsyncStorage.setItem('@records', JSON.stringify(newMerged));
           await AsyncStorage.setItem('@records_last_sync', Date.now().toString());
         } catch(e) {}
      } else {
         dispatch({ type: 'SET_TRANSACTIONS', payload: stateRef.current.transactions });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to fetch records' });
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  const updateTransactionFields = async (key: string, fields: any) => {
    // Optimistic update
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { key, fields } });
    
    // Background API call
    const success = await updateRecord(key, fields);
    if (!success) {
      // Revert if failed by re-fetching
      refreshRecords();
      return false;
    }
    return true;
  };

  const saveConfiguredBanks = async (banks: ConfiguredBank[]) => {
    dispatch({ type: 'SET_SETTINGS', payload: { configuredBanks: banks } });
    const success = await updateSettings({ configuredBanks: banks });
    if (!success) {
       const settings = await fetchSettings();
       dispatch({ type: 'SET_SETTINGS', payload: settings });
       return false;
    }
    return true;
  };

  const saveCustomTags = async (tags: string[]) => {
    dispatch({ type: 'SET_SETTINGS', payload: { ...stateRef.current, customTags: tags } });
    const success = await updateSettings({ customTags: tags });
    if (!success) {
       const settings = await fetchSettings();
       dispatch({ type: 'SET_SETTINGS', payload: settings });
       return false;
    }
    return true;
  };

  const saveCategories = async (categories: string[]) => {
    dispatch({ type: 'SET_SETTINGS', payload: { ...stateRef.current, categories } });
    const success = await updateSettings({ categories });
    if (!success) {
       const settings = await fetchSettings();
       dispatch({ type: 'SET_SETTINGS', payload: settings });
       return false;
    }
    return true;
  };

  const saveCategorizationRules = async (rules: Record<string, string>) => {
    dispatch({ type: 'SET_SETTINGS', payload: { ...stateRef.current, categorizationRules: rules } });
    const success = await updateSettings({ categorizationRules: rules });
    if (!success) {
       const settings = await fetchSettings();
       dispatch({ type: 'SET_SETTINGS', payload: settings });
       return false;
    }
    return true;
  };

  const applyCategorizationRulesToPast = async (startDate?: string, endDate?: string): Promise<{ updatedCount: number }> => {
    const rules = stateRef.current.categorizationRules;
    const ruleEntries = Object.entries(rules).map(([pattern, cat]) => ([pattern.toLowerCase().trim(), cat]));

    if (ruleEntries.length === 0) return { updatedCount: 0 };

    const startMs = startDate ? new Date(startDate).getTime() : 0;
    const endMs = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1 : Infinity;

    let count = 0;
    const updates: Record<string, any> = {};

    stateRef.current.transactions.forEach(tx => {
      const txMs = new Date(tx._docId).getTime();
      if (txMs >= startMs && txMs <= endMs) {
        const merchant = (tx.to_from || '').toLowerCase();
        for (const [pattern, targetCat] of ruleEntries) {
          if (pattern && merchant.includes(pattern)) {
            if (tx.category !== targetCat) {
              updates[tx._key] = { category: targetCat };
              count++;
            }
            break;
          }
        }
      }
    });

    if (count > 0) {
      for (const [key, fields] of Object.entries(updates)) {
        dispatch({ type: 'UPDATE_TRANSACTION', payload: { key, fields } });
        await updateRecord(key, fields);
      }
    }

    return { updatedCount: count };
  };

  const refreshSettings = async () => {
    const settings = await fetchSettings().catch(() => ({}));
    if (settings && Object.keys(settings).length > 0) {
       dispatch({ type: 'SET_SETTINGS', payload: settings });
       try {
         await AsyncStorage.setItem('@settings', JSON.stringify(settings));
         await AsyncStorage.setItem('@settings_last_sync', Date.now().toString());
       } catch(e) {}
    }
  };

  const setAuthContext = async (username: string) => {
    setApiUser(username);
    dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, username } });
    await AsyncStorage.setItem('@auth_username', username);
    refreshRecords(); // start fetching dataset after login
    refreshSettings(); // fetch latest settings immediately after login
  };

  const logout = async () => {
    try {
      dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: false, username: null } });
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      dispatch({ type: 'SET_SETTINGS', payload: {} });
      
      const keys = [
        '@auth_username',
        '@records',
        '@records_last_sync',
        '@settings',
        '@settings_last_sync',
        'cached_stash_messages'
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.error('Error during logout:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Load dark mode preference
      const storedDarkMode = await AsyncStorage.getItem('@dark_mode');
      if (storedDarkMode !== null) {
        dispatch({ type: 'SET_DARK_MODE', payload: storedDarkMode === 'true' });
      }

      const storedUser = await AsyncStorage.getItem('@auth_username');
      if (storedUser) {
        setApiUser(storedUser);
        dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, username: storedUser } });
      } else {
        dispatch({ type: 'SET_LOADING_AUTH', payload: false });
        dispatch({ type: 'SET_LOADING', payload: false });
        return; // Halt boot, show login screen
      }

      let storedRecords: FlatTransaction[] = [];
      let lastSync = 0;
      try {
         const cached = await AsyncStorage.getItem('@records');
         const cachedTime = await AsyncStorage.getItem('@records_last_sync');
         if (cached) storedRecords = JSON.parse(cached);
         if (cachedTime) lastSync = parseInt(cachedTime, 10);
      } catch (e) {}

      if (storedRecords.length > 0) {
          dispatch({ type: 'SET_TRANSACTIONS', payload: storedRecords });
          dispatch({ type: 'SET_LOADING', payload: false });
      }

      let cachedSettings = {};
      let settingsLastSync = 0;
      try {
        const s = await AsyncStorage.getItem('@settings');
        const t = await AsyncStorage.getItem('@settings_last_sync');
        if (s) cachedSettings = JSON.parse(s);
        if (t) settingsLastSync = parseInt(t, 10);
      } catch (e) {}

      if (Object.keys(cachedSettings).length > 0) {
        dispatch({ type: 'SET_SETTINGS', payload: cachedSettings });
      }

      const needsSettingsFetch = Date.now() - settingsLastSync > 24 * 60 * 60 * 1000;

      // Wake up & fetch dataset
      wakeUp();
      
      dispatch({ type: 'SET_SYNCING', payload: true });
      const effectiveLastSync = lastSync || (Date.now() - (90 * 24 * 60 * 60 * 1000));
      const promises: Promise<any>[] = [ fetchRecords(effectiveLastSync).catch(() => []) ];
      if (needsSettingsFetch) {
        promises.push(fetchSettings().catch(() => ({})));
      }

      const [records, newSettings] = await Promise.all(promises);
      
      const newMerged = mergeAndSortRecords(storedRecords, records);

      if (records.length > 0) {
         dispatch({ type: 'SET_TRANSACTIONS', payload: newMerged });
         
         try {
            await AsyncStorage.setItem('@records', JSON.stringify(newMerged));
            await AsyncStorage.setItem('@records_last_sync', Date.now().toString());
         } catch(e) {}
      } else {
          dispatch({ type: 'SET_SYNCING', payload: false });
      }
      
      if (newSettings && Object.keys(newSettings).length > 0) {
        dispatch({ type: 'SET_SETTINGS', payload: newSettings });
        try {
          await AsyncStorage.setItem('@settings', JSON.stringify(newSettings));
          await AsyncStorage.setItem('@settings_last_sync', Date.now().toString());
        } catch(e) {}
      }
    };
    init();
  }, []);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      refreshRecords,
      updateTransactionFields,
      saveConfiguredBanks,
      saveCustomTags,
      saveCategories,
      saveCategorizationRules,
      applyCategorizationRulesToPast,
      setAuthContext,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};
