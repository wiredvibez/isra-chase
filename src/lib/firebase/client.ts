import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

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
let storageInstance: FirebaseStorage;

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
  storageInstance = getStorage(app);

  // The SDK retries a failing upload for ten minutes by default, reporting no
  // progress and no error the whole time — which looks exactly like a stuck
  // 0%. Players on a phone deserve to be told quickly that it failed.
  storageInstance.maxUploadRetryTime = 20_000;
  storageInstance.maxOperationRetryTime = 20_000;

  if (useEmulator) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8080);
    connectStorageEmulator(storageInstance, "127.0.0.1", 9199);
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

export function getFirebaseStorage(): FirebaseStorage {
  init();
  return storageInstance;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}
