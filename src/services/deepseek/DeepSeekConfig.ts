import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE = 'deepseek_api_key';
const BASE_URL_STORAGE = 'deepseek_base_url';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';

export class DeepSeekConfig {
  private static cachedApiKey: string | null = null;
  private static cachedBaseUrl: string | null = null;

  static async getApiKey(): Promise<string | null> {
    if (this.cachedApiKey) return this.cachedApiKey;
    const key = await AsyncStorage.getItem(API_KEY_STORAGE);
    this.cachedApiKey = key;
    return key;
  }

  static async setApiKey(key: string): Promise<void> {
    this.cachedApiKey = key;
    await AsyncStorage.setItem(API_KEY_STORAGE, key);
  }

  static async getBaseUrl(): Promise<string> {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;
    const url = await AsyncStorage.getItem(BASE_URL_STORAGE);
    this.cachedBaseUrl = url || DEFAULT_BASE_URL;
    return this.cachedBaseUrl;
  }

  static async setBaseUrl(url: string): Promise<void> {
    this.cachedBaseUrl = url;
    await AsyncStorage.setItem(BASE_URL_STORAGE, url);
  }

  static async isConfigured(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!key && key.length > 0;
  }

  /** 清除缓存（切换 Key 时调用） */
  static clearCache(): void {
    this.cachedApiKey = null;
    this.cachedBaseUrl = null;
  }
}
