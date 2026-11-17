import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.messagingSenderId && config.appId);
const app = configured ? (getApps().length ? getApp() : initializeApp(config)) : null;
const auth = app ? getAuth(app) : null;
const persistenceReady = auth ? setPersistence(auth, browserLocalPersistence) : Promise.resolve();

export async function getDirectStudioAuth(): Promise<{ token: string; user: { id: string; email: string } }> {
  if (!auth) throw new Error('Studio sign-in is not configured. The Firebase web-app settings are missing from this build.');
  await persistenceReady;
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Sign in with your Every Frame First Studio account to use MIA.');
  return { token: await currentUser.getIdToken(), user: { id: currentUser.uid, email: currentUser.email || '' } };
}

export async function performDirectStudioAuth(action: 'sign_in' | 'sign_up' | 'reset_password', email: string, password = ''): Promise<{ token?: string; user?: { id: string; email: string }; notice?: string }> {
  if (!auth) throw new Error('Studio sign-in is not configured. The Firebase web-app settings are missing from this build.');
  await persistenceReady;
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('Enter your email address.');
  try {
    if (action === 'sign_in') await signInWithEmailAndPassword(auth, normalizedEmail, password);
    else if (action === 'sign_up') {
      if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
      await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    } else {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { notice: 'If an account exists for that email, a password reset message has been sent.' };
    }
  } catch (cause) {
    const code = (cause as { code?: string }).code;
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
      'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled for the Studio Firebase project.',
      'auth/network-request-failed': 'Could not reach Firebase. Check your connection.',
    };
    throw new Error((code && messages[code]) || (cause instanceof Error ? cause.message : 'Studio authentication failed.'));
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Studio sign-in completed, but the secure session could not be verified.');
  return { token: await user.getIdToken(), user: { id: user.uid, email: user.email || '' } };
}
