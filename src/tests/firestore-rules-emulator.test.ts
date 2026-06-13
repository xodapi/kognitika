// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeWithEmulator = emulatorHost ? describe : describe.skip;

let testEnv: RulesTestEnvironment;

const feedbackDoc = (overrides: Record<string, unknown> = {}) => ({
  userId: 'synthetic-user',
  userName: 'Synthetic User',
  brainLabel: 'Brain SYNTHETIC',
  content: 'Synthetic feedback without personal data',
  type: 'idea',
  createdAt: serverTimestamp(),
  status: 'new',
  ...overrides,
});

const seededFeedbackDoc = () => ({
  userId: 'synthetic-user',
  userName: 'Synthetic User',
  brainLabel: 'Brain SYNTHETIC',
  content: 'Seeded synthetic feedback without personal data',
  type: 'bug',
  createdAt: Timestamp.fromMillis(1_700_000_000_000),
  status: 'new',
});

describeWithEmulator('Firestore feedback security rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'kognitika-rules-test',
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('allows feedback create for a signed-in Brain session without email claims', async () => {
    const db = testEnv.authenticatedContext('synthetic-user').firestore();

    await assertSucceeds(setDoc(doc(db, 'feedback', 'synthetic-feedback'), feedbackDoc()));
  });

  it('rejects feedback documents with email, token, or raw Brain ID fields', async () => {
    const db = testEnv.authenticatedContext('synthetic-user').firestore();

    await assertFails(setDoc(doc(db, 'feedback', 'with-email'), feedbackDoc({ email: 'synthetic@example.invalid' })));
    await assertFails(setDoc(doc(db, 'feedback', 'with-token'), feedbackDoc({ token: 'synthetic-token' })));
    await assertFails(setDoc(doc(db, 'feedback', 'with-brain-id'), feedbackDoc({ brainId: 'BR-SYNTHETIC-RAW' })));
  });

  it('rejects feedback create when userId does not match auth uid', async () => {
    const db = testEnv.authenticatedContext('synthetic-user').firestore();

    await assertFails(setDoc(doc(db, 'feedback', 'wrong-owner'), feedbackDoc({ userId: 'other-user' })));
  });

  it('allows list only for admin custom claim', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'feedback', 'seeded-feedback'), seededFeedbackDoc());
    });

    const userDb = testEnv.authenticatedContext('synthetic-user').firestore();
    const adminDb = testEnv.authenticatedContext('synthetic-admin', { admin: true }).firestore();

    await assertFails(getDocs(collection(userDb, 'feedback')));
    await assertSucceeds(getDocs(collection(adminDb, 'feedback')));
  });

  it('does not require email or email_verified claims for admin access', async () => {
    const adminDb = testEnv.authenticatedContext('synthetic-admin', { admin: true }).firestore();

    const snapshot = await assertSucceeds(getDocs(collection(adminDb, 'feedback')));
    expect(snapshot).toBeTruthy();
  });
});
