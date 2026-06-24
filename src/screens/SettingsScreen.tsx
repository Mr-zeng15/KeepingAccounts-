import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { DeepSeekConfig } from '../services/deepseek/DeepSeekConfig';
import { showThemedAlert } from '../components/AlertProvider';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const key = await DeepSeekConfig.getApiKey();
    const url = await DeepSeekConfig.getBaseUrl();
    setApiKey(key || '');
    setBaseUrl(url);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showThemedAlert('提示', '请输入 API Key');
      return;
    }
    await DeepSeekConfig.setApiKey(apiKey.trim());
    if (baseUrl.trim()) {
      await DeepSeekConfig.setBaseUrl(baseUrl.trim());
    }
    showThemedAlert('成功', '配置已保存');
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      showThemedAlert('提示', '请先输入 API Key');
      return;
    }

    setTesting(true);
    try {
      const url = baseUrl.trim() || 'https://api.deepseek.com';
      const response = await fetch(`${url}/v1/models`, {
        headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
      });

      if (response.ok) {
        showThemedAlert('连接成功', 'DeepSeek API Key 有效！');
      } else {
        const text = await response.text();
        showThemedAlert('连接失败', `状态码: ${response.status}\n${text}`);
      }
    } catch (e: any) {
      showThemedAlert('连接失败', e.message || '网络错误');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* API Key 配置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DeepSeek API 配置</Text>
        <Text style={styles.sectionDesc}>
          请前往 platform.deepseek.com 获取 API Key
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>API Key</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-..."
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowKey(!showKey)}
            >
              <Ionicons
                name={showKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Base URL（可选）</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.deepseek.com"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>留空将使用默认地址</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTest}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Text style={styles.testButtonText}>测试连接</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>保存配置</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 使用说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>使用说明</Text>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>1.</Text>
          <Text style={styles.tipText}>前往 platform.deepseek.com 注册账号</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>2.</Text>
          <Text style={styles.tipText}>在 API Keys 页面创建新的 Key</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>3.</Text>
          <Text style={styles.tipText}>复制 Key 粘贴到上方输入框</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>4.</Text>
          <Text style={styles.tipText}>保存后即可使用语音记账功能</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  testButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  tipBullet: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 20,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
