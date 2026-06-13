import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const readText = (file) => readFileSync(resolve(root, file), 'utf8');

const appConfig = readJson('firebase-applet-config.json');
const firebaseRc = readJson('.firebaserc');
const firebaseJson = readJson('firebase.json');
const blueprint = readJson('firebase-blueprint.json');
const rules = readText('firestore.rules');
const rulesHash = createHash('sha256').update(rules.replace(/\r\n/g, '\n')).digest('hex');

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const firestoreConfig = Array.isArray(firebaseJson.firestore)
  ? firebaseJson.firestore[0]
  : firebaseJson.firestore;

expect(firebaseRc.projects?.default === appConfig.projectId, '.firebaserc default project must match firebase-applet-config.json projectId');
expect(Boolean(firestoreConfig), 'firebase.json must declare firestore config');
expect(firestoreConfig?.rules === 'firestore.rules', 'firebase.json must deploy firestore.rules');
expect(
  !firestoreConfig?.database || firestoreConfig.database === appConfig.firestoreDatabaseId,
  'firebase.json firestore database must match firebase-applet-config.json firestoreDatabaseId',
);
expect(firebaseJson.emulators?.firestore?.host === '127.0.0.1', 'Firestore emulator host must be 127.0.0.1');
expect(Number(firebaseJson.emulators?.firestore?.port) > 0, 'Firestore emulator port must be configured');

expect(rules.includes('request.auth.token.admin == true'), 'firestore.rules must use admin custom claim');
expect(!rules.includes('request.auth.token.email'), 'firestore.rules must not authorize admin by email');
expect(!rules.includes('email_verified'), 'firestore.rules must not depend on email_verified');
expect(!rules.includes('ADMIN_EMAIL'), 'firestore.rules must not reference ADMIN_EMAIL');

const feedback = blueprint.entities?.Feedback;
const feedbackProperties = Object.keys(feedback?.properties || {});
const forbiddenBlueprintFields = ['email', 'password', 'token', 'authToken', 'refreshToken', 'brainId'];

expect(Boolean(feedback), 'firebase-blueprint.json must define Feedback entity');
expect(feedbackProperties.includes('brainLabel'), 'Feedback blueprint must include short brainLabel');
for (const field of forbiddenBlueprintFields) {
  expect(!feedbackProperties.includes(field), `Feedback blueprint must not expose ${field}`);
}

if (failures.length > 0) {
  console.error('[firebase-rules-config] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[firebase-rules-config] ok project=${appConfig.projectId} database=${appConfig.firestoreDatabaseId}`);
console.log(`[firebase-rules-config] firestore.rules sha256=${rulesHash}`);
