import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthBoundary from './components/AuthBoundary';

const Home = React.lazy(() => import('./pages/Home'));

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
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
