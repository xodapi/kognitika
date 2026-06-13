import { eventBus } from '../server/events/event-bus.ts';
import prisma from './prisma.ts';
import nodemailer from 'nodemailer';
import { createSafeLogger, safeError } from './safe-logger.ts';

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
    
    // Future: Trigger high-perf batch analytics in Rust here
    // For now, we just acknowledge the completion
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const adminEmail = adminNotificationEmail();
    const userLabel = user.pseudonym || (user.brainId ? `Brain ${user.brainId.slice(0, 8)}` : `User ${user.id.slice(0, 8)}`);
    
    // Admin-only delivery channel. This is not public auth identity.
    if (adminEmail) {
      await transporter.sendMail({
        from: `Kognitika Feedback <${mailConfig.auth.user}>`,
        to: adminEmail,
        subject: `[Kognitika Feedback] ${type} - ${trackingNum}`,
        text: `Обращение: ${trackingNum}\nОт: ${userLabel}\nТип: ${type}\n\nТекст:\n${content}`
      });
    }

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
