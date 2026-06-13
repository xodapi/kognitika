import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { createSafeLogger } from './safe-logger';

const logger = createSafeLogger('firebase');

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    logger.debug('Firebase connected');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      logger.error('Firebase client appears offline');
    }
  }
}

// Initial connection test
testConnection();
