import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { GOOGLE_CLIENT_ID } from './config';
import { GoogleOAuthProvider } from '@react-oauth/google';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
