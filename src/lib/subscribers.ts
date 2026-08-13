import { eventBus } from '../server/events/event-bus.ts';
import { createSafeLogger, safeError } from './safe-logger.ts';
import { getNotificationRecipientRepository } from '../server/infrastructure/container.ts';
import {
  buildFeedbackTelegramMessage,
  buildIdeaTelegramMessage,
  sendTelegramAdminMessage,
} from '../server/services/telegram-notifier.ts';

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
 * Subscriber: Handle Feedback Submission
 * Sends privacy-safe notifications to the configured admin Telegram channel.
 */
eventBus.on('feedback:submitted', async (data) => {
  try {
    const { userId, trackingNum, type, content } = data;
    const user = await getNotificationRecipientRepository().findByUserId(userId);
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
    const user = await getNotificationRecipientRepository().findByUserId(userId);
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
