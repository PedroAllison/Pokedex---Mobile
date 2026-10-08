import * as SecureStore from 'expo-secure-store';
import type { Lang } from './types';

export async function loadApiKey(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync('gemini_api_key')) ?? '';
  } catch {
    return '';
  }
}
export async function saveApiKey(k: string) {
  try {
    if (k) await SecureStore.setItemAsync('gemini_api_key', k);
    else await SecureStore.deleteItemAsync('gemini_api_key');
  } catch {}
}
export async function loadLang(): Promise<Lang> {
  try {
    const v = await SecureStore.getItemAsync('lang');
    return v === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}
export async function saveLang(l: Lang) {
  try {
    await SecureStore.setItemAsync('lang', l);
  } catch {}
}

export async function loadPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
export async function savePref(key: string, value: string | null) {
  try {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {}
}
