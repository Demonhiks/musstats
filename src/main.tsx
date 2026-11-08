import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой контейнер');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker регистрируем только в собранной версии: офлайн-режим нужен на телефоне.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* без SW приложение тоже работает, просто не офлайн */
      });
  });
}
