/**
 * @vitest-environment node
 */
import express from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const notifierMock = vi.hoisted(() => ({
  buildInvestorLeadTelegramMessage: vi.fn(() => 'Synthetic investor lead'),
  sendTelegramAdminMessage: vi.fn(),
}));

vi.mock('../server/services/telegram-notifier.ts', () => notifierMock);

let investorLeadRoutes: express.Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  investorLeadRoutes = (await import('../server/routes/investor-leads.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  notifierMock.sendTelegramAdminMessage.mockResolvedValue({ delivered: true, disabled: false, status: 200 });
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/investor-leads', investorLeadRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function submit(baseUrl: string, body: unknown) {
  const response = await fetch(`${baseUrl}/api/investor-leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const validLead = {
  name: 'Synthetic Investor',
  organization: 'Synthetic Fund',
  contact: '@synthetic_investor',
  interest: 'materials',
  message: 'Synthetic message for materials.',
  website: '',
};

describe('investor leads route', () => {
  it('forwards a valid minimal lead to the server-side notifier', async () => {
    const response = await submit(await createHarness(), validLead);

    expect(response).toEqual({ status: 202, body: { success: true } });
    expect(notifierMock.buildInvestorLeadTelegramMessage).toHaveBeenCalledWith({
      name: 'Synthetic Investor',
      organization: 'Synthetic Fund',
      contact: '@synthetic_investor',
      interest: 'materials',
      message: 'Synthetic message for materials.',
    });
    expect(notifierMock.sendTelegramAdminMessage).toHaveBeenCalledWith('Synthetic investor lead');
  });

  it('rejects invalid and unknown fields without notifying Telegram', async () => {
    const response = await submit(await createHarness(), { ...validLead, contact: 'not a contact', extra: 'nope' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Validation failed', code: 'VALIDATION_ERROR' });
    expect(notifierMock.sendTelegramAdminMessage).not.toHaveBeenCalled();
  });

  it('accepts honeypot submissions without forwarding their contents', async () => {
    const response = await submit(await createHarness(), { ...validLead, website: 'https://spam.invalid' });

    expect(response).toEqual({ status: 202, body: { success: true } });
    expect(notifierMock.sendTelegramAdminMessage).not.toHaveBeenCalled();
  });

  it('returns a generic retry message when Telegram delivery is unavailable', async () => {
    notifierMock.sendTelegramAdminMessage.mockResolvedValue({ delivered: false, disabled: true });

    const response = await submit(await createHarness(), validLead);

    expect(response).toEqual({ status: 503, body: { error: 'Заявку пока не удалось отправить. Напишите нам в Telegram.' } });
  });
});
