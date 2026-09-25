import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import { setUserLogHandler } from '@firebase/logger';

// Configure log level to silent to suppress harmless background connection retry notices in console
setLogLevel('silent');

// Filter out transient offline/unreachable notices that occur when running inside preview iframes
setUserLogHandler((logData) => {
  if (logData.message && logData.message.includes('Could not reach Cloud Firestore backend')) {
    // Suppress benign connection retry message when client operates in offline mode
    return;
  }
  if (logData.level === 'error') {
    console.error(`[Firebase ${logData.type}]:`, logData.message);
  }
});

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Initialize Firestore with auto-detect long polling and ignore undefined properties
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  }, databaseId);
} catch {
  dbInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = dbInstance;
export default app;
