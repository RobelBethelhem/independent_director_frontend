import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { installTamperGuard } from './lib/tamper-guard';
import 'flag-icons/css/flag-icons.min.css';
import './styles/tokens.css';
import './styles/app.css';

// Inspection deterrent — active in production builds only (no-op in dev).
installTamperGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
