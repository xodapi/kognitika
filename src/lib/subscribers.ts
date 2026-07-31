import { eventBus } from '../server/events/event-bus.ts';
import prisma from './prisma.ts';
import { createSafeLogger, safeError } from './safe-logger.ts';
import {
  buildFeedbackTelegramMessage,
  buildIdeaTelegramMessage,
  sendTelegramAdminMessage,
} from '../server/services/telegram-notifier.ts';
import { persistSessionAnalyticsSummary } from '../server/services/analytics-persistence.ts';
import { createSessionAnalyticsSummary, parseSessionAnalyticsJob, type SessionAnalyticsJob } from '../core/analyze-session/index.ts';

const logger = createSafeLogger('subscribers');

function adminNotificationUserLabel(user: { pseudonym?: string | null; name?: string | null }) {
  return user.pseudonym || user.name || 'Brain ID user';
}

async function deliverTelegramAdminNotification(text: string, eventLabel: string) {
  const result = await sendTelegramAdminMessage(text);

  if (result.disabled) {
    logger.info('Telegram admin notifications disabled', { eventLabel });
    return;
  }

  if (!result.delivered) {
    logger.warn('Telegram admin notification failed', {
      eventLabel,
      status: result.status ?? 'n/a',
      error: result.error,
    });
    return;
  }

  logger.info('Telegram admin notification delivered', {
    eventLabel,
    status: result.status ?? 'n/a',
  });
}

/**
 * Subscriber: Handle Game Completion
 * Focuses on secondary effects like long-term analytics processing
 */
eventBus.on('game:completed', async (data) => {
  try {
    logger.info('Processing completed game session', {
      sessionLabel: `Session ${String(data.sessionId).slice(0, 8)}`,
      userLabel: `User ${String(data.userId).slice(0, 8)}`,
    });

    const gameSession = await prisma.gameSession.findUnique({
      where: { id: data.sessionId },
    });

    if (gameSession) {
      const job: SessionAnalyticsJob = {
        schemaVersion: 1,
        jobId: `analytics-job-${gameSession.id}`,
        analyzerVersion: 'analyze-session-v1',
        receivedAt: new Date().toISOString(),
        session: {
          schemaVersion: 1,
          sessionId: gameSession.id,
          moduleId: gameSession.gameType.toLowerCase().replace(/_/g, '-'),
          category: 'cognitive',
          startedAt: gameSession.createdAt.toISOString(),
          completedAt: gameSession.isCompleted ? gameSession.createdAt.toISOString() : undefined,
          events: [],
        },
      };

      const parsed = parseSessionAnalyticsJob(job);
      if (parsed.success) {
        const summary = createSessionAnalyticsSummary(parsed.data);
        await persistSessionAnalyticsSummary(gameSession.userId, summary);
        logger.info('Session analytics summary persisted', { jobId: summary.jobId });
      }
    }
  } catch (err) {
    logger.error('Game completed handler failed', { error: safeError(err) });
  }
});

/**
 * Subscriber: Handle Feedback Submission
 * Sends privacy-safe notifications to the configured admin Telegram channel.
 */
eventBus.on('feedback:submitted', async (data) => {
  try {
    const { userId, trackingNum, type, content } = data;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        pseudonym: true,
      },
    });
    if (!user) return;

    await deliverTelegramAdminNotification(buildFeedbackTelegramMessage({
      trackingNum,
      type,
      userLabel: adminNotificationUserLabel(user),
      content,
    }), 'feedback:submitted');

    logger.info('Feedback notifications processed', { trackingNum, type });
  } catch (err) {
    logger.error('Feedback handler failed', { error: safeError(err) });
  }
});

/**
 * Subscriber: Handle Idea Submission
 * Sends privacy-safe admin notifications after durable persistence.
 */
eventBus.on('idea:submitted', async (data) => {
  try {
    const { userId, ideaId, title, description } = data;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        pseudonym: true,
      },
    });
    if (!user) return;

    await deliverTelegramAdminNotification(buildIdeaTelegramMessage({
      ideaId,
      title,
      userLabel: adminNotificationUserLabel(user),
      description,
    }), 'idea:submitted');

    logger.info('Idea notifications processed', { ideaLabel: `Idea ${ideaId.slice(0, 8)}` });
  } catch (err) {
    logger.error('Idea handler failed', { error: safeError(err) });
  }
});
