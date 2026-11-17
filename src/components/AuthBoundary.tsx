import React, { FormEvent, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, authReady, firebaseConfigured, getFirebaseConfigError } from '../lib/firebase';

type Props = { children: React.ReactNode };

export default function AuthBoundary({ children }: Props): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(firebaseConfigured);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!auth) {
      setChecking(false);
      return;
    }
    const firebaseAuth = auth;
    let unsubscribe = () => {};
    authReady
      .then(() => {
        unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
          setUser(nextUser);
          setChecking(false);
        });
      })
      .catch(() => {
        setError('Firebase Authentication could not initialize. Check the app configuration.');
        setChecking(false);
      });
    return () => unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account already exists for this email.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
        'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
        'auth/operation-not-allowed':
          'Email/password sign-in has not been enabled in Firebase yet.',
        'auth/network-request-failed': 'Could not reach Firebase. Check your connection.',
      };
      setError(
        (code && messages[code]) ||
          (cause instanceof Error ? cause.message : 'Authentication failed.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!auth || !email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('If an account exists for that email, a password reset message has been sent.');
    } catch {
      setError(
        'Could not send a password reset email. Check the address and Firebase configuration.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseConfigured && !import.meta.env.PROD) {
    return (
      <>
        <div className="auth-dev-notice">
          Development preview · Firebase is not configured yet. Authentication is bypassed only in
          this local development mode.
        </div>
        {children}
      </>
    );
  }

  if (!firebaseConfigured) {
    return (
      <main className="auth-screen">
        <section className="auth-card" role="alert">
          <p className="auth-eyebrow">EVERY FRAME FIRST STUDIO</p>
          <h1>Authentication setup required</h1>
          <p>{getFirebaseConfigError()}</p>
          <p>Sign-in is fail-closed in production until the Firebase configuration is supplied.</p>
        </section>
      </main>
    );
  }

  if (checking) {
    return (
      <main className="auth-screen">
        <p className="auth-muted">Checking your secure session…</p>
      </main>
    );
  }

  if (user) {
    return (
      <>
        <div className="auth-session-bar">
          <span>
            Signed in as <strong>{user.email}</strong>
          </span>
          <button type="button" onClick={() => signOut(auth!)} className="auth-signout">
            Sign out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-eyebrow">EVERY FRAME FIRST STUDIO</p>
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-muted">Private access for your in-house photo studio.</p>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        {mode === 'signin' && (
          <button className="auth-link" type="button" disabled={busy} onClick={resetPassword}>
            Forgot password?
          </button>
        )}
        <p className="auth-switch">
          {mode === 'signin' ? 'New to the studio?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setNotice('');
            }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
}
