import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SciencePage from './SciencePage';
import './styles.css';

const page = window.location.pathname.replace(/\/+$/, '') === '/science' ? <SciencePage /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
