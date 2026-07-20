import { z } from 'zod';
import { storageGateway } from './storage-gateway';
import { ONBOARDING_STATE_KEY } from './storage-keys';

const ONBOARDING_VERSION = 1;

const onboardingStateSchema = z.object({
  version: z.literal(ONBOARDING_VERSION),
  completed: z.boolean(),
});

export function hasCompletedOnboarding(): boolean {
  const result = storageGateway.get(ONBOARDING_STATE_KEY, onboardingStateSchema);
  return result.ok && result.value?.completed === true;
}

export function completeOnboarding(): void {
  storageGateway.set(
    ONBOARDING_STATE_KEY,
    { version: ONBOARDING_VERSION, completed: true },
    onboardingStateSchema,
  );
}
