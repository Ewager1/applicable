import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import './styles.css';
import { removeLegacyContact } from './resume/contact-storage.ts';

try {
  removeLegacyContact(window.localStorage);
} catch {
  // The browser may deny access to the storage object itself.
}

const container = document.getElementById('root');
if (!container) throw new Error('The application root is missing.');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
