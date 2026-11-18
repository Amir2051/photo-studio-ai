import React, { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

type Props = { children: React.ReactNode };

export default function AuthBoundary({ children }: Props): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(supabaseConfigured);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    const client = supabase;
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setChecking(false);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice(
            'Account created. If email confirmation is required, check your inbox, then sign in.',
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      const messages: Record<string, string> = {
        'Invalid login credentials': 'Email or password is incorrect.',
        'User already registered': 'An account already exists for this email.',
        'Email not confirmed': 'Confirm your email address first, then sign in.',
        'Password should be at least 6 characters':
          'Choose a stronger password with at least 8 characters.',
        'Email rate limit exceeded': 'Too many attempts. Wait a moment and try again.',
      };
      setError(
        messages[message] ||
          (message && !/^[A-Za-z]/.test(message)
            ? 'Could not reach auth service. Check your connection.'
            : message) ||
          'Authentication failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!supabase || !email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setNotice('If an account exists for that email, a password reset message has been sent.');
    } catch {
      setError('Could not send a password reset email. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // On success the browser navigates to Google; this only returns on failure.
    if (oauthError) {
      const message = oauthError.message || '';
      setError(
        /provider is not enabled|Unsupported provider/i.test(message)
          ? 'Google sign-in is not enabled yet for this studio.'
          : message || 'Could not start Google sign-in.',
      );
      setBusy(false);
    }
  };

  const localDevBypass = !supabaseConfigured && !import.meta.env.PROD;

  if (localDevBypass) {
    return (
      <>
        <div className="auth-dev-notice">
          Development preview · Supabase is not configured yet. Authentication is bypassed only in
          this local development mode.
        </div>
        {children}
      </>
    );
  }

  if (!supabaseConfigured) {
    return (
      <main className="auth-screen">
        <section className="auth-card" role="alert">
          <p className="auth-eyebrow">MINU STUDIO</p>
          <h1>Authentication setup required</h1>
          <p>
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
            from the project Settings → API.
          </p>
          <p>Sign-in is fail-closed in production until the configuration is supplied.</p>
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
          <button
            type="button"
            onClick={() => void supabase?.auth.signOut()}
            className="auth-signout"
          >
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
        <p className="auth-eyebrow">MINU STUDIO</p>
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
        <div className="auth-divider" role="separator" aria-label="Or continue with">
          <span>or</span>
        </div>
        <button className="auth-google" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a7.8 7.8 0 0 1 0-4.93V6.33H2.18a11.8 11.8 0 0 0 0 11.07l3.66-2.84z" />
            <path fill="#EA4335" d="M12 4.64c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.46 1.09 15 0 12 0 7.7 0 3.99 2.47 2.18 6.33l3.66 2.84C6.71 6.57 9.14 4.64 12 4.64z" />
          </svg>
          <span>{mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
        </button>
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
