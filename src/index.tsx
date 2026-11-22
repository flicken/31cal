// Tells public/reload-on-fail.js that the bundle loaded and ran.
(window as any).__31calBooted = true;

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { reloadForNewVersion } from './lib/newVersion';
import { GOOGLE_CLIENT_ID } from './config';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Safety net only: the build is a single bundle, so a chunk from an older
// deploy should never be requested. If one is, reload to get the new build
// (unless there's unsaved work; then a toast offers Reload).
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
