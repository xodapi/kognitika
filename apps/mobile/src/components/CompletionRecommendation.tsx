import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, ActivityIndicator } from 'react-native';
import { buildMobilePracticeRecommendation, recordPracticeRecommended } from '../lib/practice-recommendations';

interface CompletionRecommendationProps {
  sourceModuleId: string;
  sourceSessionId?: string | null;
  score: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  onRepeat: () => void;
  onMenu: () => void;
  submitting?: boolean;
  submitSuccess?: boolean | null;
  onRetrySync?: () => void;
}

export default function CompletionRecommendation({
  sourceModuleId,
  sourceSessionId,
  score,
  accuracy,
  errors,
  durationMs,
  onRepeat,
  onMenu,
  submitting = false,
  submitSuccess = null,
  onRetrySync,
}: CompletionRecommendationProps) {
  const [webNoticeVisible, setWebNoticeVisible] = useState(false);

  const recommendation = useMemo(() => {
    return buildMobilePracticeRecommendation({
      sourceModuleId,
      accuracy,
    });
  }, [sourceModuleId, accuracy]);

  // Эмитим событие отправки рекомендации при маунте компонента
  useEffect(() => {
    const sessionId = sourceSessionId || `mobile-session-${Date.now()}`;
    recordPracticeRecommended(recommendation, sessionId);
  }, [recommendation, sourceSessionId]);

  const handleStartRecommended = () => {
    if (recommendation.moduleId === 'schulte') {
      onRepeat();
    } else {
      setWebNoticeVisible(true);
      setTimeout(() => {
        setWebNoticeVisible(false);
      }, 4500);
    }
  };

  const handleOpenWeb = async () => {
    const url = 'https://kognitika.syntog.ru';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Тренировка завершена!</Text>

      {/* Stats Table */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Очки</Text>
          <Text style={styles.statValueScore}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Время</Text>
          <Text style={styles.statValue}>{formatTime(durationMs)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Точность</Text>
          <Text style={styles.statValue}>{accuracy.toFixed(1)}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Ошибки</Text>
          <Text style={[styles.statValue, errors > 0 && styles.statValueError]}>{errors}</Text>
        </View>
      </View>

      {/* Sync status */}
      <View style={styles.syncStatusContainer}>
        {submitting ? (
          <View style={styles.syncRow}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.syncText}>Синхронизация с сервером...</Text>
          </View>
        ) : submitSuccess === true ? (
          <Text style={styles.syncTextSuccess}>✅ Результаты сохранены в облаке</Text>
        ) : submitSuccess === false ? (
          <View style={styles.syncErrorRow}>
            <Text style={styles.syncTextError}>❌ Ошибка синхронизации</Text>
            {onRetrySync && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetrySync}>
                <Text style={styles.retryButtonText}>Повторить</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>

      {/* Grid of Insights */}
      <View style={styles.insightGrid}>
        <View style={[styles.insightCard, styles.successCard]}>
          <Text style={[styles.insightHeader, styles.successHeaderText]}>✅ ЧТО ПОЛУЧИЛОСЬ</Text>
          <Text style={styles.insightBody}>{recommendation.successText}</Text>
        </View>

        <View style={[styles.insightCard, styles.improvementCard]}>
          <Text style={[styles.insightHeader, styles.improvementHeaderText]}>🎯 ЧТО УЛУЧШИТЬ</Text>
          <Text style={styles.insightBody}>{recommendation.improvementText}</Text>
        </View>

        <View style={[styles.insightCard, styles.nextTestCard]}>
          <Text style={[styles.insightHeader, styles.nextTestHeaderText]}>✨ СЛЕДУЮЩИЙ ТЕСТ</Text>
          <Text style={styles.nextTestTitle}>{recommendation.title}</Text>
          <Text style={styles.insightBody}>{recommendation.reasonText}</Text>
        </View>
      </View>

      {/* Web Notice overlay */}
      {webNoticeVisible && (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeText}>
            Тренажер «{recommendation.title}» доступен в полной веб-версии!
          </Text>
          <TouchableOpacity onPress={handleOpenWeb} style={styles.webLinkButton}>
            <Text style={styles.webLinkButtonText}>Открыть kognitika.syntog.ru 🌐</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartRecommended}>
          <Text style={styles.primaryButtonText}>
            {recommendation.moduleId === 'schulte' ? 'Повторить' : 'Начать рекомендованное ➔'}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtonRow}>
          {recommendation.moduleId !== 'schulte' && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onRepeat}>
              <Text style={styles.secondaryButtonText}>🔁 Повторить</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, recommendation.moduleId === 'schulte' && { flex: 1 }]}
            onPress={onMenu}
          >
            <Text style={styles.secondaryButtonText}>🏠 В меню</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#111625',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242C44',
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0A0E1A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2342',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  statValueScore: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6366F1',
  },
  statValueError: {
    color: '#EF4444',
  },
  syncStatusContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  syncTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  syncErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncTextError: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  retryButton: {
    backgroundColor: '#1E293B',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightGrid: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  insightCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  improvementCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  nextTestCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  insightHeader: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  successHeaderText: {
    color: '#10B981',
  },
  improvementHeaderText: {
    color: '#F59E0B',
  },
  nextTestHeaderText: {
    color: '#6366F1',
  },
  insightBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#94A3B8',
  },
  nextTestTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  webNotice: {
    width: '100%',
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  webNoticeText: {
    color: '#E0E7FF',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  webLinkButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  webLinkButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
  },
});
