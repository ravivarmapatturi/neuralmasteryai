import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import DesignExperiment from './DesignExperiment';
it('shows different failure outcomes and records the learner decision', () => {
  render(<ThemeProvider><DesignExperiment /></ThemeProvider>);
  fireEvent.click(screen.getByLabelText(/Simulate the search/)); fireEvent.click(screen.getByRole('button', { name: /Run the experiment/ }));
  expect(screen.getByText(/no source to consult/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Store a copy/)); fireEvent.click(screen.getByRole('button', { name: /Run the experiment/ }));
  expect(screen.getByText(/yesterday’s manual/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Which design/),{target:{value:'Use a cache with version checks.'}}); fireEvent.click(screen.getByText('Save my decision on this device'));
  expect(JSON.parse(localStorage.getItem('nm-lab-outage-decision')!).decision).toBe('Use a cache with version checks.');
});
it('checks a one-click prediction and fills the outcome grid as designs are tried', () => {
  localStorage.clear();
  render(<ThemeProvider><DesignExperiment /></ThemeProvider>);
  fireEvent.click(screen.getByLabelText(/outdated advice/));
  fireEvent.click(screen.getByRole('button', { name: /Run the experiment/ }));
  expect(screen.getByText('Your prediction holds.')).toBeInTheDocument();
  expect(screen.getByLabelText('Outcomes explored: 1 of 4')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Simulate the search/)); fireEvent.click(screen.getByRole('button', { name: /Run the experiment/ }));
  expect(screen.getByLabelText('Outcomes explored: 2 of 4')).toBeInTheDocument();
  expect(screen.getAllByText('No answer').length).toBeGreaterThan(0);
});
