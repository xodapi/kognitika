import { Router } from 'express';
import { z } from 'zod';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { buildInvestorLeadTelegramMessage, sendTelegramAdminMessage } from '../services/telegram-notifier.ts';
import { validateBody } from '../middleware/validate.ts';

const router = Router();
const logger = createSafeLogger('investor-leads-route');

const contactPattern = /(?:^@?[a-zA-Z0-9_]{5,32}$)|(?:^[^\s@]+@[^\s@]+\.[^\s@]+$)/;

export const investorLeadSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(120),
  organization: z.string().trim().max(160).optional().default(''),
  contact: z.string().trim().min(3, 'Укажите Telegram или email').max(200)
    .refine((value) => contactPattern.test(value), 'Укажите Telegram username или email'),
  interest: z.enum(['meeting', 'materials', 'pilot']),
  message: z.string().trim().max(1200).optional().default(''),
  website: z.string().trim().max(200).optional().default(''),
}).strict();

router.post('/', validateBody(investorLeadSchema), async (req, res) => {
  const { name, organization, contact, interest, message, website } = req.validated!.body;

  // A hidden honeypot lets common automated submissions finish without
  // revealing the anti-spam rule or sending user-provided content onward.
  if (website) return res.status(202).json({ success: true });

  try {
    const delivery = await sendTelegramAdminMessage(buildInvestorLeadTelegramMessage({
      name,
      organization,
      contact,
      interest,
      message,
    }));

    if (!delivery.delivered) {
      logger.warn('Investor lead delivery unavailable', {
        disabled: delivery.disabled,
        status: delivery.status ?? 'n/a',
      });
      return res.status(503).json({ error: 'Заявку пока не удалось отправить. Напишите нам в Telegram.' });
    }

    return res.status(202).json({ success: true });
  } catch (error) {
    logger.error('Investor lead submission failed', { error: safeError(error) });
    return res.status(500).json({ error: 'Заявку пока не удалось отправить. Напишите нам в Telegram.' });
  }
});

export default router;
