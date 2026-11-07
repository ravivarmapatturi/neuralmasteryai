import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PlanCertificate } from './StudyPlansPages';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { GamificationProvider } from '../contexts/GamificationContext';
import { ProgressProvider } from '../contexts/ProgressContext';
import { STUDY_PLANS } from '../data/studyPlans';

const wrap = (ui: React.ReactNode) => render(<ThemeProvider><MemoryRouter><AuthProvider><ProgressProvider><GamificationProvider>{ui}</GamificationProvider></ProgressProvider></AuthProvider></MemoryRouter></ThemeProvider>);
const plan = STUDY_PLANS[0];

describe('PlanCertificate', () => {
  it('says how many problems are left until the plan is complete', () => {
    wrap(<PlanCertificate plan={plan} problems={5} passed={2} />);
    expect(screen.getByText(/Pass all 5 problems to get a certificate/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Print/ })).not.toBeInTheDocument();
  });
  it('shows a printable certificate once every problem passes', () => {
    wrap(<PlanCertificate plan={plan} problems={5} passed={5} />);
    expect(screen.getByRole('img', { name: new RegExp(`completed ${plan.title}`) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument();
  });
});
