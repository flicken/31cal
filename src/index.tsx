import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { reloadForNewVersion } from './lib/newVersion';
import { GOOGLE_CLIENT_ID } from './config';
import { GoogleOAuthProvider } from '@react-oauth/google';

// A lazy chunk from an older deployment is gone: reload to get the new
// build (unless there's unsaved work; then the error boundary shows and a
// toast offers Reload).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
