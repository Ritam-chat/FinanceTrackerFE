import { FlatTransaction, flattenTransactions } from '../utils/flatten';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const rawRunLocal = (process.env.EXPO_PUBLIC_RUN_LOCAL || '').trim().toLowerCase();
const isLocal = rawRunLocal === 'true';

let localIp = '127.0.0.1';
if (Constants.expoConfig?.hostUri) {
  localIp = Constants.expoConfig.hostUri.split(':')[0];
} else if (Platform.OS === 'android') {
  localIp = '10.0.2.2';
}

const localPort = process.env.EXPO_PUBLIC_LOCAL_PORT || '5001';
const BASE_URL = isLocal
  ? `http://${localIp}:${localPort}`
  : 'https://finance---api.vercel.app';

let _user = 'Ritam';
export const setApiUser = (user: string) => { _user = user; };

const getHeaders = () => ({
  'user': _user,
  'Content-Type': 'application/json',
  'Username': _user,
});

export const wakeUp = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/wake-up`);
    return res.ok;
  } catch {
    return false;
  }
};

export const addRecord = async (data: {
  address: string;
  body: string;
  readable_date: string;
  tags?: string[];
  gps?: string;
}): Promise<string> => {
  try {
    const res = await fetch(`${BASE_URL}/add-record`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result.message;
  } catch (error) {
    console.error('Error adding record:', error);
    return 'Error adding record';
  }
};

export const fetchRecords = async (since?: number): Promise<FlatTransaction[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    let url = `${BASE_URL}/records?uname=ritariya&key=210102`;
    if (since) url += `&since=${since}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} (${res.statusText}) from ${url}: ${errText.slice(0, 150)}`);
    }
    const data = await res.json();
    return flattenTransactions(data);
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchSettings = async (): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE_URL}/settings`, { 
      headers: getHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }
};

export const updateSettings = async (data: any): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

export const updateRecord = async (key: string, _fields: any): Promise<boolean> => {
  // Since key has bank~account~timestamp, the backend expects {"BANK~ACCOUNT~TIMESTAMP": { ...fields }}
  const payload = {
    [key]: _fields
  };

  try {
    const res = await fetch(`${BASE_URL}/update-records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (error) {
    console.error('Error updating record:', error);
    return false;
  }
};

export const authenticate = async (username: string, password: string): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/auth`, {
      method: 'GET',
      headers: { ...getHeaders(), 'Username': username, 'Password': password },
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};
export const fetchStash = async (since?: number): Promise<any[]> => {
  try {
    let url = `${BASE_URL}/stash`;
    if (since) url += `?since=${since}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
};

export const deleteStashedItem = async (address: string, id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/stash?address=${encodeURIComponent(address)}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const clearStash = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/stash/clear`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const updateStashItem = async (oldAddress: string, oldId: string, data: any): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/stash?address=${encodeURIComponent(oldAddress)}&id=${encodeURIComponent(oldId)}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};
export const saveManualRecord = async (data: any): Promise<boolean> => {
  try {
    const res = await fetch(`${BASE_URL}/manual-record`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error('Error saving manual record:', error);
    return false;
  }
};
