import { eventBus } from '../server/events/event-bus.ts';
import prisma from './prisma.ts';
import nodemailer from 'nodemailer';
import { createSafeLogger, safeError } from './safe-logger.ts';
import {
  buildFeedbackTelegramMessage,
  buildIdeaTelegramMessage,
  sendTelegramAdminMessage,
} from '../server/services/telegram-notifier.ts';
import { persistSessionAnalyticsSummary } from '../server/services/analytics-persistence.ts';
import { createSessionAnalyticsSummary, parseSessionAnalyticsJob, type SessionAnalyticsJob } from '../core/analyze-session/index.ts';

const logger = createSafeLogger('subscribers');

// Email Config (Stalwart) - Shared with server.ts
const mailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false }
};

const transporter = nodemailer.createTransport(mailConfig);

function isLegacyEmailNotificationsEnabled() {
  return process.env.LEGACY_EMAIL_NOTIFICATIONS_ENABLED === 'true';
}

function adminNotificationEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || null;
}

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
        await persistSessionAnalyticsSummary(summary);
        logger.info('Session analytics summary persisted', { jobId: summary.jobId });
      }
    }
  } catch (err) {
    logger.error('Game completed handler failed', { error: safeError(err) });
  }
});

/**
 * Subscriber: Handle Feedback Submission
 * Sends notifications to Admin (Email/Telegram) and confirmation to User
 */
eventBus.on('feedback:submitted', async (data) => {
  try {
    const { userId, trackingNum, type, content } = data;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        pseudonym: true,
      },
    });
    if (!user) return;

    const adminEmail = adminNotificationEmail();
    const userLabel = adminNotificationUserLabel(user);
    
    // Admin-only delivery channel. This is not public auth identity.
    if (adminEmail) {
      await transporter.sendMail({
        from: `Kognitika Feedback <${mailConfig.auth.user}>`,
        to: adminEmail,
        subject: `[Kognitika Feedback] ${type} - ${trackingNum}`,
        text: `Обращение: ${trackingNum}\nОт: ${userLabel}\nТип: ${type}\n\nТекст:\n${content}`
      });
    }

    await deliverTelegramAdminNotification(buildFeedbackTelegramMessage({
      trackingNum,
      type,
      userLabel,
      content,
    }), 'feedback:submitted');

    // Legacy opt-in only: Brain ID public users are not contacted by email.
    if (isLegacyEmailNotificationsEnabled() && user.email) {
      const displayName = user.pseudonym || user.name || 'участник';
      await transporter.sendMail({
        from: `Syntog Support <${mailConfig.auth.user}>`,
        to: user.email,
        subject: `Ваше обращение ${trackingNum} получено`,
        text: `Здравствуйте, ${displayName}!\n\nМы получили ваше сообщение (${type}).\nНомер обращения: ${trackingNum}\n\nМы свяжемся с вами в ближайшее время.`
      });
    }

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
