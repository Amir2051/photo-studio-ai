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
