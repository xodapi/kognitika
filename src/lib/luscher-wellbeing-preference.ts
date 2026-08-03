import { z } from 'zod';
import { storageGateway } from './storage-gateway';

export const LUSCHER_WELLBEING_PREFERENCE_KEY = 'kognitika:ui:luscher-wellbeing:v1';

const preferenceSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
});

export function isLuscherWellbeingEnabled(): boolean {
  const result = storageGateway.get(LUSCHER_WELLBEING_PREFERENCE_KEY, preferenceSchema);
  return !result.ok || result.value?.enabled !== false;
}

export function setLuscherWellbeingEnabled(enabled: boolean): void {
  storageGateway.set(
    LUSCHER_WELLBEING_PREFERENCE_KEY,
    { version: 1, enabled },
    preferenceSchema,
  );
}
