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
  Alert,
} from 'react-native';
import { loginWithBrainId } from '../lib/api';

interface BrainIdScreenProps {
  onAuthenticated: (brainId: string) => void;
}

export default function BrainIdScreen({ onAuthenticated }: BrainIdScreenProps) {
  const [brainId, setBrainId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!brainId.trim()) {
      setError('Введите ваш Brain ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithBrainId({ brainId: brainId.trim(), pin: pin || undefined });
      onAuthenticated(result.brainId);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }, [brainId, pin, onAuthenticated]);

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

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Brain ID</Text>
          <TextInput
            style={styles.input}
            value={brainId}
            onChangeText={setBrainId}
            placeholder="Ваш уникальный Brain ID"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>PIN (опционально)</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="4-значный PIN"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            editable={!loading}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Используйте тот же Brain ID, что и в веб-версии,{'\n'}
          чтобы синхронизировать ваш прогресс.
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
  form: {
    marginBottom: 32,
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
  hint: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 20,
  },
});
