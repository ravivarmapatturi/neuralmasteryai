import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import BlogMechanism from './BlogMechanism';
it('changes the attention cache illustration while keeping the state fixed', () => {
  render(<ThemeProvider><BlogMechanism slug="kimi-k3-linear-attention" /></ThemeProvider>);
  fireEvent.change(screen.getByRole('slider'),{target:{value:'24'}});
  expect(screen.getByRole('img')).toHaveAccessibleName(/24 token records/);
});
it('lets readers follow a decision model through to its structured result', () => {
  render(<ThemeProvider><BlogMechanism slug="jeva-decision-models" /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button',{name:'4. Return a choice'}));
  expect(screen.getByRole('img')).toHaveAccessibleName(/Step 4/);
  expect(screen.getByText(/probabilities still need evaluation/)).toBeInTheDocument();
});
it('opens a healthcare part on its own journey stage and labels it', () => {
  render(<ThemeProvider><BlogMechanism slug="us-healthcare-13-claim-adjudication" /></ThemeProvider>);
  expect(screen.getByText('YOU ARE HERE · PART 13')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /3\. Review the claim/ })).toHaveAttribute('aria-pressed', 'true');
});
