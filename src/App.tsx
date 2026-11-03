import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import AuthBoundary from './components/AuthBoundary';

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={
            <AuthBoundary>
              <Home />
            </AuthBoundary>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
