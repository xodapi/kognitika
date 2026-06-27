import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { loginWithBrainId, createNewBrainSession } from '../lib/api';

interface BrainIdScreenProps {
  onAuthenticated: (brainId: string) => void;
}

export default function BrainIdScreen({ onAuthenticated }: BrainIdScreenProps) {
  const [brainId, setBrainId] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!brainId.trim()) {
      setError('Введите ваш Brain ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithBrainId({ brainId: brainId.trim() });
      onAuthenticated(result.brainId);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }, [brainId, onAuthenticated]);

  const handleCreateNew = useCallback(async () => {
    setCreating(true);
    setError(null);

    try {
      const result = await createNewBrainSession();
      onAuthenticated(result.brainId);
    } catch (err: any) {
      setError(err.message || 'Ошибка создания сессии');
    } finally {
      setCreating(false);
    }
  }, [onAuthenticated]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.title}>Kognitika</Text>
          <Text style={styles.subtitle}>Когнитивная инженерия</Text>
        </View>

        {/* Restore form */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Войти по Brain ID</Text>
          <Text style={styles.label}>Brain ID</Text>
          <TextInput
            style={styles.input}
            value={brainId}
            onChangeText={setBrainId}
            placeholder="Введите ваш Brain ID"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading && !creating}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || creating) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || creating}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>или</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* New session */}
        <TouchableOpacity
          style={[styles.buttonSecondary, (loading || creating) && styles.buttonDisabled]}
          onPress={handleCreateNew}
          disabled={loading || creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <Text style={styles.buttonSecondaryText}>🆕 Создать новую сессию</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Новая сессия создаст анонимный Brain ID.{'\n'}
          Сохраните его, чтобы войти снова.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E0E6FF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E0E6FF',
    marginBottom: 16,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#2D3348',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#E0E6FF',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#2D1B1B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2D3348',
  },
  dividerText: {
    color: '#4B5563',
    marginHorizontal: 12,
    fontSize: 14,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonSecondaryText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 20,
  },
});
