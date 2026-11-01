import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import MockInterviewPage from './MockInterviewPage';

vi.mock('../layout/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('../../contexts/FocusMusicContext', () => ({ useFocusMusic: () => ({ pause: () => {} }) }));
// Fake on-device engine: no model download in tests.
vi.mock('../../lib/mockInterview/engine', () => ({
  initEngine: vi.fn(async () => true),
  onProgress: () => () => {},
  speak: () => {}, stopSpeaking: () => {},
  startRecording: vi.fn(async () => { throw new Error('no mic'); }),
  transcribe: vi.fn(async () => ''),
  embed: vi.fn(async (texts: string[]) => texts.map(t => [t.toLowerCase().includes('variance') ? 1 : 0, 1])),
}));

it('runs a typed one-question session and shows a report with criteria and improvements', async () => {
  render(<MemoryRouter><MockInterviewPage /></MemoryRouter>);
  expect(screen.getByText(/Free and private/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Questions'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: /Start mock interview/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Start answering/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/type your answer/i);
  fireEvent.change(screen.getByLabelText('Type your answer'), { target: { value: 'This is a high variance problem with the model. First, I would clarify the data. I would verify with a held out metric.' } });
  fireEvent.click(screen.getByRole('button', { name: /Submit answer/ }));
  expect(await screen.findByText('Your interview report')).toBeInTheDocument();
  expect(screen.getByLabelText(/Overall: \d+ out of 100/)).toBeInTheDocument();
  expect(screen.getByText('Key points', { selector: 'h3' })).toBeInTheDocument();
  expect(screen.getByText(/Improve next time|Where to improve first/)).toBeInTheDocument();
});
