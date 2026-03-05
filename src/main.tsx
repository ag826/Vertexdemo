import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/app-theme.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
