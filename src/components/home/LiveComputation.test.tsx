import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LiveComputation from './LiveComputation';

describe('LiveComputation', () => {
  it('starts on the attention computation and links to its lesson', () => {
    render(<MemoryRouter><LiveComputation /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Tokens attend to tokens/i })).toBeInTheDocument();
    expect(screen.getByText('Q · Kᵀ / √d scores normalized with softmax')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open lesson/i })).toHaveAttribute('href', '/docs/deep-learning/attention-transformers');
  });

  it('lets a visitor change the visible computation without a page reload', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LiveComputation /></MemoryRouter>);
    await user.click(screen.getByRole('tab', { name: 'Gradient descent' }));
    expect(screen.getByRole('heading', { name: /Loss moves downhill/i })).toBeInTheDocument();
    expect(screen.getByText(/θ ← θ/i)).toBeInTheDocument();
  });

  it('supports locking to a specific concept and hiding tab buttons', () => {
    render(<MemoryRouter><LiveComputation lockConcept="gradient" hideTabs /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Loss moves downhill/i })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
