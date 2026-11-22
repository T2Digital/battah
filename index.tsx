import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Ensure standalone deployments pick up newly deployed Service Worker builds cleanly; skip reload hook when embedded inside t2os.app
const isEmbeddedShell =
  typeof window !== 'undefined' && /^\/(?:shop|drop)(?:\/|$)/i.test(window.location.pathname || '');
if (!isEmbeddedShell && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadedForNewSw = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloadedForNewSw) {
      reloadedForNewSw = true;
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);