import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { generateGrid, generateExpectedSequence, CellValue, GameMode } from '../lib/schulte-generator';
import { submitGameResult, getStoredBrainId } from '../lib/api';

interface SchulteScreenProps {
  onLogout: () => void;
}

export default function SchulteScreen({ onLogout }: SchulteScreenProps) {
  const { width } = useWindowDimensions();
  const [brainId, setBrainId] = useState<string | null>(null);

  // Game Settings
  const [size, setSize] = useState<number>(5);
  const [mode, setMode] = useState<GameMode>('classic');

  // Game State
  const [grid, setGrid] = useState<CellValue[]>([]);
  const [expectedSequence, setExpectedSequence] = useState<CellValue[]>([]);
  const [expectedIndex, setExpectedIndex] = useState<number>(0);
  const [timeMs, setTimeMs] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [errors, setErrors] = useState<number>(0);

  // Click Feedback State
  const [clickedCellId, setClickedCellId] = useState<number | null>(null);
  const [isClickCorrect, setIsClickCorrect] = useState<boolean | null>(null);

  // API Submit State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);

  // Refs for Timer
  const timerRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Brain ID
  useEffect(() => {
    getStoredBrainId().then(setBrainId);
  }, []);

  // Timer clean up
  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const startGame = useCallback(() => {
    const seq = generateExpectedSequence(size, mode);
    const newGrid = generateGrid(size, mode);

    setGrid(newGrid);
    setExpectedSequence(seq);
    setExpectedIndex(0);
    setErrors(0);
    setTimeMs(0);
    setIsActive(true);
    setIsFinished(false);
    setSubmitSuccess(null);

    startTimeRef.current = Date.now();

    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    const updateTime = () => {
      setTimeMs(Date.now() - startTimeRef.current);
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [size, mode]);

  const resetGame = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setIsActive(false);
    setIsFinished(false);
    setGrid([]);
    setExpectedSequence([]);
    setExpectedIndex(0);
    setErrors(0);
    setTimeMs(0);
    setSubmitSuccess(null);
  }, []);

  const handleCellPress = useCallback((cell: CellValue) => {
    if (!isActive || isFinished) return;

    const expected = expectedSequence[expectedIndex];
    const isCorrect = cell.num === expected.num;

    // Visual feedback
    setClickedCellId(cell.id);
    setIsClickCorrect(isCorrect);

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setClickedCellId(null);
      setIsClickCorrect(null);
    }, 200);

    if (isCorrect) {
      const nextIndex = expectedIndex + 1;
      if (nextIndex >= expectedSequence.length) {
        // Game finished
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        const finalTime = Date.now() - startTimeRef.current;
        setTimeMs(finalTime);
        setIsActive(false);
        setIsFinished(true);

        // Submit results
        const accuracy = (expectedSequence.length / (expectedSequence.length + errors)) * 100;
        const score = Math.max(0, 1000 - Math.floor(finalTime / 10));

        submitResults(size, finalTime, accuracy, score, errors);
      } else {
        setExpectedIndex(nextIndex);
      }
    } else {
      setErrors(prev => prev + 1);
    }
  }, [isActive, isFinished, expectedSequence, expectedIndex, errors, size]);

  const submitResults = async (gSize: number, gTimeMs: number, gAccuracy: number, gScore: number, gErrors: number) => {
    setSubmitting(true);
    try {
      await submitGameResult({
        type: 'SCHULTE',
        size: gSize,
        timeMs: gTimeMs,
        accuracy: gAccuracy,
        score: gScore,
        errors: gErrors
      });
      setSubmitSuccess(true);
    } catch (err) {
      console.warn('Failed to submit results:', err);
      setSubmitSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format time (e.g. 12.34s)
  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  // Grid Layout
  const padding = 32;
  const gridWidth = width - padding;
  const cellSize = gridWidth / size;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Brain ID</Text>
          <Text style={styles.userValue}>{brainId || 'Загрузка...'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Settings Panel (Visible only when not playing) */}
        {!isActive && !isFinished && (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Настройки тренировки</Text>
            
            <Text style={styles.settingsLabel}>Размер таблицы</Text>
            <View style={styles.tabsRow}>
              {[3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.tabButton, size === s && styles.tabButtonActive]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.tabText, size === s && styles.tabTextActive]}>{s}x{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Режим игры</Text>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'classic' && styles.tabButtonActive, { flex: 1 }]}
                onPress={() => setMode('classic')}
              >
                <Text style={[styles.tabText, mode === 'classic' && styles.tabTextActive]}>Классический (1 ➔ N)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'reverse' && styles.tabButtonActive, { flex: 1 }]}
                onPress={() => setMode('reverse')}
              >
                <Text style={[styles.tabText, mode === 'reverse' && styles.tabTextActive]}>Обратный (N ➔ 1)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Начать тренировку</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HUD / Stats display while playing */}
        {isActive && (
          <View style={styles.hudCard}>
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>Время</Text>
              <Text style={styles.hudValue}>{formatTime(timeMs)}</Text>
            </View>
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>Ошибки</Text>
              <Text style={[styles.hudValue, errors > 0 && styles.hudValueError]}>{errors}</Text>
            </View>
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>Цель</Text>
              <Text style={styles.hudValueTarget}>
                {expectedSequence[expectedIndex] ? expectedSequence[expectedIndex].num : '-'}
              </Text>
            </View>
          </View>
        )}

        {/* The Schulte Grid */}
        {isActive && (
          <View style={[styles.gridContainer, { width: gridWidth, height: gridWidth }]}>
            {grid.map((cell, idx) => {
              const isClicked = clickedCellId === cell.id;
              const cellStyle = [
                styles.cell,
                { width: cellSize - 4, height: cellSize - 4, margin: 2 },
                isClicked && (isClickCorrect ? styles.cellCorrect : styles.cellError)
              ];

              return (
                <TouchableOpacity
                  key={cell.id}
                  style={cellStyle}
                  activeOpacity={0.7}
                  onPress={() => handleCellPress(cell)}
                >
                  <Text style={styles.cellText}>{cell.num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Cancel / Stop button during game */}
        {isActive && (
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>Сбросить</Text>
          </TouchableOpacity>
        )}

        {/* Finished Screen / Stats Summary */}
        {isFinished && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>🎉 Тренировка завершена!</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Размер:</Text>
              <Text style={styles.resultValue}>{size}x{size}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Время:</Text>
              <Text style={styles.resultValue}>{formatTime(timeMs)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Ошибки:</Text>
              <Text style={[styles.resultValue, errors > 0 && styles.hudValueError]}>{errors}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Точность:</Text>
              <Text style={styles.resultValue}>
                {((expectedSequence.length / (expectedSequence.length + errors)) * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Очки:</Text>
              <Text style={styles.resultValueScore}>
                {Math.max(0, 1000 - Math.floor(timeMs / 10))}
              </Text>
            </View>

            {/* Sync status */}
            <View style={styles.syncStatusContainer}>
              {submitting ? (
                <View style={styles.syncRow}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={styles.syncText}>Синхронизация с сервером...</Text>
                </View>
              ) : submitSuccess === true ? (
                <Text style={styles.syncTextSuccess}>✅ Результаты синхронизированы</Text>
              ) : submitSuccess === false ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.syncTextError}>❌ Ошибка синхронизации</Text>
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={() => submitResults(
                      size, 
                      timeMs, 
                      (expectedSequence.length / (expectedSequence.length + errors)) * 100, 
                      Math.max(0, 1000 - Math.floor(timeMs / 10)), 
                      errors
                    )}
                  >
                    <Text style={styles.retryButtonText}>Повторить попытку</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Играть еще раз</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
              <Text style={styles.resetButtonText}>В главное меню</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1E2538',
  },
  userInfo: {
    flexDirection: 'column',
  },
  userLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E0E6FF',
  },
  logoutButton: {
    backgroundColor: '#1E2538',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  settingsCard: {
    backgroundColor: '#131A2E',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: '#1E2538',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#E0E6FF',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#1E2538',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D354E',
  },
  tabButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hudCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#131A2E',
    borderRadius: 12,
    paddingVertical: 12,
    width: '90%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E2538',
  },
  hudItem: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  hudValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E0E6FF',
  },
  hudValueError: {
    color: '#EF4444',
  },
  hudValueTarget: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cell: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cellCorrect: {
    backgroundColor: '#065F46',
    borderColor: '#10B981',
  },
  cellError: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  cellText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  resetButton: {
    marginTop: 24,
    backgroundColor: '#1E2538',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D354E',
  },
  resetButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#131A2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    borderWidth: 1,
    borderColor: '#1E2538',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E0E6FF',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1E2538',
  },
  resultLabel: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E0E6FF',
  },
  resultValueScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  syncStatusContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    color: '#6B7280',
    fontSize: 14,
  },
  syncTextSuccess: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
  },
  syncTextError: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#3B0712',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  retryButtonText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
});
