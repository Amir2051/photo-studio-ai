import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthBoundary from './components/AuthBoundary';

const Home = React.lazy(() => import('./pages/Home'));
const AudioStudio = React.lazy(() => import('./pages/AudioStudio'));
const Cull = React.lazy(() => import('./pages/Cull'));
const Gallery = React.lazy(() => import('./pages/Gallery'));
const Privacy = React.lazy(() => import('./pages/Privacy'));

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/cull"
          element={
            <AuthBoundary>
              <React.Suspense
                fallback={
                  <main className="auth-screen">
                    <p className="auth-muted">Loading the cull workspace…</p>
                  </main>
                }
              >
                <Cull />
              </React.Suspense>
            </AuthBoundary>
          }
        />
        <Route path="/privacy" element={
          <React.Suspense
            fallback={
              <main className="auth-screen">
                <p className="auth-muted">Loading…</p>
              </main>
            }
          >
            <Privacy />
          </React.Suspense>
        } />
        <Route path="/gallery/:shareId" element={
          <React.Suspense
            fallback={
              <main className="auth-screen">
                <p className="auth-muted">Loading gallery…</p>
              </main>
            }
          >
            <Gallery />
          </React.Suspense>
        } />
        <Route
          path="/audio/*"
          element={
            <AuthBoundary>
              <React.Suspense
                fallback={
                  <main className="auth-screen">
                    <p className="auth-muted">Loading your studio…</p>
                  </main>
                }
              >
                <AudioStudio />
              </React.Suspense>
            </AuthBoundary>
          }
        />
        <Route
          path="*"
          element={
            <AuthBoundary>
              <React.Suspense
                fallback={
                  <main className="auth-screen">
                    <p className="auth-muted">Loading your studio…</p>
                  </main>
                }
              >
                <Home />
              </React.Suspense>
            </AuthBoundary>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
