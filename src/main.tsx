import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './styles/theme.css';
import './styles/notebook.css';
import './styles/learning-experiences.css';
import App from './App.tsx';
import { installErrorReporting } from './components/home/LiveStats';
import { installPreloadErrorHandler } from './lib/preloadError';

installErrorReporting();
installPreloadErrorHandler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
