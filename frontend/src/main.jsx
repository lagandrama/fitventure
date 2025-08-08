import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ⬇️ NEW: izvuci userId iz JWT-a i spremi ga u localStorage ako ga nema
(function ensureUserIdFromToken() {
  try {
    const token = localStorage.getItem('token');
    const hasUserId = !!localStorage.getItem('userId');
    if (token && !hasUserId) {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const possibleKeys = ['userId', 'id', '_id', 'sub'];
      const found = possibleKeys.map(k => payload?.[k]).find(Boolean);
      if (found) localStorage.setItem('userId', String(found));
    }
  } catch (e) {
    // console.warn('Cannot decode JWT payload', e);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);