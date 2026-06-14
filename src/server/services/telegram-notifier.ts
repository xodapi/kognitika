import { redactText, safeError } from '../../lib/safe-logger.ts';

const TELEGRAM_MESSAGE_LIMIT = 3900;
const CONTENT_PREVIEW_LIMIT = 1200;
const DISABLED_VALUES = new Set(['', 'replace-me', 'undefined', 'null']);

export type TelegramDeliveryResult = {
  delivered: boolean;
  disabled: boolean;
  status?: number;
  error?: unknown;
};

export type FeedbackTelegramMessage = {
  trackingNum: string;
  type: string;
  userLabel: string;
  content: string;
};

export type IdeaTelegramMessage = {
  ideaId: string;
  title: string;
  userLabel: string;
  description: string;
};

function envValue(name: string) {
  const value = process.env[name]?.trim() ?? '';
  return DISABLED_VALUES.has(value.toLowerCase()) ? '' : value;
}

function telegramConfig() {
  const token = envValue('TELEGRAM_BOT_TOKEN');
  const chatId = envValue('TELEGRAM_ADMIN_CHAT_ID');

  if (!token || !chatId) return null;
  return { token, chatId };
}

function safeField(value: unknown, maxLength = 120) {
  return redactText(value, maxLength).replace(/\s+/g, ' ').trim() || 'n/a';
}

function safePreview(value: unknown) {
  return redactText(value, CONTENT_PREVIEW_LIMIT).trim() || 'n/a';
}

function clampTelegramMessage(message: string) {
  if (message.length <= TELEGRAM_MESSAGE_LIMIT) return message;
  return `${message.slice(0, TELEGRAM_MESSAGE_LIMIT - 20)}\n...[truncated]`;
}

export function buildFeedbackTelegramMessage(input: FeedbackTelegramMessage) {
  return clampTelegramMessage([
    'Kognitika: новая обратная связь',
    `Номер: ${safeField(input.trackingNum)}`,
    `Тип: ${safeField(input.type)}`,
    `Профиль: ${safeField(input.userLabel)}`,
    '',
    'Сообщение:',
    safePreview(input.content),
  ].join('\n'));
}

export function buildIdeaTelegramMessage(input: IdeaTelegramMessage) {
  return clampTelegramMessage([
    'Kognitika: новая идея',
    `Идея: ${safeField(`Idea ${input.ideaId.slice(0, 8)}`)}`,
    `Заголовок: ${safeField(input.title, 180)}`,
    `Профиль: ${safeField(input.userLabel)}`,
    '',
    'Описание:',
    safePreview(input.description),
  ].join('\n'));
}

export async function sendTelegramAdminMessage(text: string): Promise<TelegramDeliveryResult> {
  const config = telegramConfig();
  if (!config) return { delivered: false, disabled: true };

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: clampTelegramMessage(text),
        disable_web_page_preview: true,
      }),
    });

    return {
      delivered: response.ok,
      disabled: false,
      status: response.status,
    };
  } catch (error) {
    return {
      delivered: false,
      disabled: false,
      error: safeError(error),
    };
  }
}
