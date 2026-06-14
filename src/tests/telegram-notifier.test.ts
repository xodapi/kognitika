/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFeedbackTelegramMessage,
  sendTelegramAdminMessage,
} from '../server/services/telegram-notifier.ts';

const ORIGINAL_ENV = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,
};

describe('telegram admin notifier', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_ENV.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_ADMIN_CHAT_ID = ORIGINAL_ENV.TELEGRAM_ADMIN_CHAT_ID;
    vi.unstubAllGlobals();
  });

  it('redacts sensitive identity material from feedback messages', () => {
    const message = buildFeedbackTelegramMessage({
      trackingNum: 'FB-SYNTH01',
      type: 'bug',
      userLabel: 'synthetic@example.test',
      content: 'Synthetic report with synthetic@example.test BR-SYNTHETIC-SECRET eyJabc.def.ghi',
    });

    expect(message).toContain('Kognitika: новая обратная связь');
    expect(message).toContain('FB-SYNTH01');
    expect(message).not.toContain('synthetic@example.test');
    expect(message).not.toContain('BR-SYNTHETIC-SECRET');
    expect(message).not.toContain('eyJabc.def.ghi');
    expect(message).toContain('[redacted]');
  });

  it('treats missing Telegram env as disabled without calling fetch', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'replace-me';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendTelegramAdminMessage('Synthetic notification.');

    expect(result).toEqual({ delivered: false, disabled: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends configured admin messages to Telegram', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:synthetic-token';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '-1001234567890';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendTelegramAdminMessage('Synthetic notification.');

    expect(result).toEqual({ delivered: true, disabled: false, status: 200 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123456:synthetic-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      chat_id: '-1001234567890',
      text: 'Synthetic notification.',
      disable_web_page_preview: true,
    });
  });

  it('returns a safe failure result when Telegram is unavailable', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:synthetic-token';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '-1001234567890';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic network failure')));

    const result = await sendTelegramAdminMessage('Synthetic notification.');

    expect(result.delivered).toBe(false);
    expect(result.disabled).toBe(false);
    expect(JSON.stringify(result.error)).toContain('synthetic network failure');
  });
});
