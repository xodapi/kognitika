import { eventBus } from './event-bus.ts';
import prisma from './prisma.ts';
import nodemailer from 'nodemailer';

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

/**
 * Subscriber: Handle Game Completion
 * Focuses on secondary effects like long-term analytics processing
 */
eventBus.on('game:completed', async (data) => {
  try {
    console.log(`[EDA Subscriber] Processing session ${data.sessionId} for user ${data.userId}`);
    
    // Future: Trigger high-perf batch analytics in Rust here
    // For now, we just acknowledge the completion
  } catch (err) {
    console.error('[EDA Error] Game Completed Handler:', err);
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

    const adminEmail = process.env.ADMIN_EMAIL || 'd88u5@syntog.ru';
    const userLabel = user.pseudonym || user.brainId || `User ${user.id.slice(0, 8)}`;
    
    // 1. Notify Admin via Email
    await transporter.sendMail({
      from: `Kognitika Feedback <${mailConfig.auth.user}>`,
      to: adminEmail,
      subject: `[Kognitika Feedback] ${type} - ${trackingNum}`,
      text: `Обращение: ${trackingNum}\nОт: ${userLabel}\nТип: ${type}\n\nТекст:\n${content}`
    });

    // 2. Confirmation to User
    if (user.email) {
      await transporter.sendMail({
        from: `Syntog Support <${mailConfig.auth.user}>`,
        to: user.email,
        subject: `Ваше обращение ${trackingNum} получено`,
        text: `Здравствуйте, ${user.name}!\n\nМы получили ваше сообщение (${type}).\nНомер обращения: ${trackingNum}\n\nМы свяжемся с вами в ближайшее время.`
      });
    }

    console.log(`[EDA Subscriber] Notifications sent for feedback ${trackingNum}`);
  } catch (err) {
    console.error('[EDA Error] Feedback Handler:', err);
  }
});
