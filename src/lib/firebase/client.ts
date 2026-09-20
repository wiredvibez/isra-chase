import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

function ensureApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(config);
}

/** Firebase services are created lazily so that importing this module on the
 *  server (during prerender) never touches browser-only APIs. */
function init() {
  if (app) return;
  app = ensureApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  if (useEmulator) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
  }
}

export function getFirebaseAuth(): Auth {
  init();
  return authInstance;
}

export function getDb(): Firestore {
  init();
  return dbInstance;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}
