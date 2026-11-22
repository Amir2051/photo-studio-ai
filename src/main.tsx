import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initStorage } from './lib/storage';
import './index.css';
import './workflow.css';
import './pro-editor.css';
import './studio-shell.css';

void initStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  });
}
