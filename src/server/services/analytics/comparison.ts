import type { AnalyticsSessionRepository } from '../../repositories/analytics-session-repository.ts';

export type ComparisonInput = {
  gameType: string;
  score: number;
  timeMs: number;
  errors: number;
  userId: string | null;
};

export type ComparisonResult = {
  deltaPercentage: number;
  trend: 'up' | 'down' | 'stable';
  percentile: number;
  verdict: string;
  recommendedGame: string;
  recommendedGameTitle: string;
};

export class ComparisonService {
  constructor(private readonly sessions: AnalyticsSessionRepository) {}

  async compare(input: ComparisonInput): Promise<ComparisonResult> {
    let deltaPercentage = 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (input.userId) {
      const history = await this.sessions.findRecentCompletedByUserAndGameType(
        input.userId,
        input.gameType,
        10,
      );

      if (history.length > 0) {
        const avgScore = history.reduce((sum, s) => sum + s.score, 0) / history.length;
        if (avgScore > 0) {
          deltaPercentage = Math.round(((input.score - avgScore) / avgScore) * 100);
          if (deltaPercentage > 0) {
            trend = 'up';
          } else if (deltaPercentage < 0) {
            trend = 'down';
            deltaPercentage = Math.abs(deltaPercentage);
          }
        }
      }
    }

    const totalSessionsCount = await this.sessions.countCompletedByGameType(input.gameType);
    const lowerSessionsCount = await this.sessions.countCompletedWithScoreBelow(
      input.gameType,
      input.score,
    );

    let percentile = totalSessionsCount > 0 ? Math.round((lowerSessionsCount / totalSessionsCount) * 100) : 75;

    if (percentile <= 0) percentile = 12;
    if (percentile >= 100) percentile = 98;

    const verdict = this.generateVerdict(trend, deltaPercentage, input.errors);
    const { recommendedGame, recommendedGameTitle } = this.getRecommendation(input.gameType, trend, deltaPercentage);

    return {
      deltaPercentage,
      trend,
      percentile,
      verdict,
      recommendedGame,
      recommendedGameTitle,
    };
  }

  private generateVerdict(trend: 'up' | 'down' | 'stable', deltaPercentage: number, errors: number): string {
    if (trend === 'down') {
      if (deltaPercentage >= 5 && deltaPercentage <= 15) {
        return 'Колебания естественны. Мозг обрабатывает информацию и консолидирует навык. Завтра показатели стабилизируются.';
      } else if (deltaPercentage > 15 && deltaPercentage <= 30) {
        return 'Ваша когнитивная батарейка разряжена. Не перенапрягайтесь. Отдых — это тоже часть тренировочного процесса.';
      } else if (deltaPercentage > 30) {
        return 'Сегодня не лучший день для рекордов, и это совершенно нормально. Сделайте перерыв и попробуйте расслабляющий модуль «Тишина».';
      }
    } else if (errors > 3) {
      return 'Вы взяли отличный темп, но точность пострадала. Попробуйте сбавить скорость ради лучшего контроля и точности.';
    } else if (trend === 'up' && deltaPercentage > 5) {
      return `Превосходно! Ваш результат улучшился на ${deltaPercentage}% по сравнению с вашим средним уровнем. Когнитивный фокус в оптимальном состоянии.`;
    }

    return 'Отличная тренировка! Стабильные показатели когнитивных функций.';
  }

  private getRecommendation(
    gameType: string,
    trend: 'up' | 'down' | 'stable',
    deltaPercentage: number,
  ): { recommendedGame: string; recommendedGameTitle: string } {
    if (trend === 'down' && deltaPercentage > 15) {
      return {
        recommendedGame: 'silence',
        recommendedGameTitle: 'Нейрорегуляция: «Тишина»',
      };
    }

    const recommendations: Record<string, { game: string; title: string }> = {
      SCHULTE: { game: 'stroop', title: 'Эффект Струпа' },
      STROOP: { game: 'nback', title: 'Задача N-назад' },
      N_BACK: { game: 'numerical', title: 'Числовой анализ' },
      NUMERICAL_ANALYSIS: { game: 'logical', title: 'Логические матрицы' },
      LOGICAL_SEQUENCE: { game: 'spatial', title: 'Пространство' },
      SPATIAL_CONCEALMENT: { game: 'topology', title: 'Архитектура контекста' },
      TOPOLOGY_MEMORY: { game: 'collision', title: 'Детектор коллизий' },
      COLLISION_DETECTOR: { game: 'dispatcher', title: 'Асинхронный диспетчер' },
      ASYNC_DISPATCHER: { game: 'noise', title: 'Редукция шума' },
      NOISE_REDUCTION: { game: 'scanner', title: 'Смысловой сканер' },
      LANGUAGE_SCANNER: { game: 'decryptor', title: 'Декриптор' },
      DECRYPTOR: { game: 'reality', title: 'Проверка реальности' },
      REALITY_CHECK: { game: 'objective', title: 'Объективный фильтр' },
      OBJECTIVE_FILTER: { game: 'profiling', title: 'Профайлинг RICE' },
      PROFILING_RICE: { game: 'schulte', title: 'Таблицы Шульте' },
    };

    const rec = recommendations[gameType] || recommendations.SCHULTE;
    return {
      recommendedGame: rec.game,
      recommendedGameTitle: rec.title,
    };
  }
}
