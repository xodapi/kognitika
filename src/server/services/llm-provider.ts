export interface LlmJsonRequest {
  system: string;
  user: string;
  temperature?: number;
}

export interface LlmJsonProvider {
  generateJson(request: LlmJsonRequest): Promise<unknown>;
}

interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

export class OpenAiCompatibleProvider implements LlmJsonProvider {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  async generateJson(request: LlmJsonRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          response_format: { type: 'json_object' },
          temperature: request.temperature ?? 0.3,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM provider returned HTTP ${response.status}`);
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('LLM provider returned an empty response');
      return JSON.parse(stripJsonFence(content));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function boundedTimeout(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8000;
  return Math.min(30000, Math.max(1000, Math.round(parsed)));
}

export function createConfiguredLlmProvider(
  env: NodeJS.ProcessEnv = process.env,
): LlmJsonProvider | null {
  if (env.LLM_ENABLED !== 'true') return null;

  const baseUrl = String(env.LLM_BASE_URL || '').trim();
  const model = String(env.LLM_MODEL || '').trim();
  if (!baseUrl || !model) return null;

  const parsedUrl = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('LLM_BASE_URL must use HTTP or HTTPS');
  }

  return new OpenAiCompatibleProvider({
    baseUrl: parsedUrl.toString(),
    apiKey: String(env.LLM_API_KEY || '').trim() || undefined,
    model,
    timeoutMs: boundedTimeout(env.LLM_TIMEOUT_MS),
  });
}
