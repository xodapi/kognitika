import { eventBus } from './event-bus.ts';
import prisma from './prisma.ts';
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function isLegacyEmailNotificationsEnabled() {
  return process.env.LEGACY_EMAIL_NOTIFICATIONS_ENABLED === 'true';
}

/**
 * Subscriber: Weekly Report Generator
 * Triggers when a user completes their first game of the week
 * or can be called manually by a scheduler.
 */
eventBus.on('game:completed', async (data) => {
  const { userId } = data;
  
  // Check if it's Sunday (day 0) or Monday (day 1) to send reports
  const today = new Date();
  if (today.getDay() !== 1) return; // Only process on Mondays
  if (!isLegacyEmailNotificationsEnabled()) return;

  // Check if report was already sent this week (simple metadata check or separate table)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      pseudonym: true,
      brainId: true,
      email: true,
    },
  });
  if (!user) return;

  // Legacy opt-in only: Brain ID public users do not receive email reports.
  if (!user.email) {
    const label = user.brainId ? `Brain ${user.brainId.slice(0, 8)}` : `User ${user.id.slice(0, 8)}`;
    console.log(`[Report] ${label} has no legacy email, skipping email report`);
    return;
  }

  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const sessions = await prisma.gameSession.findMany({
    where: {
      userId,
      createdAt: { gte: lastWeek }
    }
  });

  if (sessions.length === 0) return;

  const avgScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length;
  const totalTime = sessions.reduce((sum, s) => sum + (s.timeMs || 0), 0) / 1000 / 60; // minutes
  const displayName = user.pseudonym || user.name || 'участник';

  await transporter.sendMail({
    from: `"Kognitika Analytics" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Ваш прогресс за неделю в Kognitika 📊`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #3b82f6; border-radius: 12px;">
        <h2 style="color: #1e40af;">Еженедельный отчет: ${displayName}</h2>
        <p>Поздравляем! Вы завершили еще одну неделю когнитивных тренировок.</p>
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p>🎯 <b>Всего сессий:</b> ${sessions.length}</p>
          <p>📈 <b>Средний балл:</b> ${Math.round(avgScore)}</p>
          <p>⏳ <b>Время в тренажерах:</b> ${Math.round(totalTime)} мин.</p>
        </div>
        <p>Продолжайте в том же духе, чтобы поддерживать свой "огненный" стрик!</p>
        <a href="https://stroy.syntog.ru/stroy/" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 5px;">Перейти к тренировкам</a>
      </div>
    `
  });

  console.log(`[EDA Subscriber] Weekly report sent to legacy email user ${user.id}`);
});
