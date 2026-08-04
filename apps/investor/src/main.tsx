import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SciencePage from './SciencePage';
import InvestorSummaryPage from './InvestorSummaryPage';
import './styles.css';

const pathname = window.location.pathname.replace(/\/+$/, '');
const page = pathname === '/science' ? <SciencePage /> : pathname === '/summary' ? <InvestorSummaryPage /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
