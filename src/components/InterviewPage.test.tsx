import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InterviewPage from './InterviewPage';
const engine = vi.hoisted(() => ({ startRecording: vi.fn(), initEngine: vi.fn(), transcribe: vi.fn() }));
vi.mock('../lib/mockInterview/engine', () => engine);
class FakeSpeech {
  static last: FakeSpeech; static starts = 0;
  continuous = false; interimResults = false; lang = ''; onresult: any = null; onerror: any = null; onend: any = null;
  constructor() { FakeSpeech.last = this; }
  start() { FakeSpeech.starts++; }
  stop() { this.onend?.(); }
}
vi.mock('./layout/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
it('lets a learner answer, review criteria, and start a new question cleanly', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  expect(screen.getByRole('button',{name:'Review my answer →'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Your answer'),{target:{value:'I would index approved sources and test grounded answers.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review my answer →'}));
  expect(screen.getByText('One strong way to answer')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Clarify the users/)); expect(screen.getByText('1 of 4 points reviewed')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/A larger model/})); expect(screen.getByLabelText('Your answer')).toHaveValue(''); expect(screen.queryByText('One strong way to answer')).not.toBeInTheDocument();
});
it('gives a typing fallback when speech recognition is unavailable', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('Answer with microphone'));
  expect(screen.getByRole('status')).toHaveTextContent('Voice input is unavailable');
});
it('finds an existing ML bank question and checks its original numerical answer', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Topic'),{target:{value:'classical-ml-questions'}});
  fireEvent.change(screen.getByLabelText('Search interview questions'),{target:{value:'5-fold cross-validation on 10,000'}});
  fireEvent.click(screen.getByRole('button',{name:/5-fold cross-validation on 10,000/}));
  fireEvent.change(screen.getByLabelText(/Your numerical answer/),{target:{value:'8000'}});
  fireEvent.click(screen.getByRole('button',{name:'Review my answer →'}));
  expect(screen.getByText('Correct calculation.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/original study guide/})).toHaveAttribute('href','/docs/interview-prep/classical-ml-questions');
});
it('retains original choice grading and exposes all preparation guides', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Search interview questions'),{target:{value:'tree with no depth limit'}});
  fireEvent.click(screen.getByRole('button',{name:/tree with no depth limit/}));
  fireEvent.click(screen.getByLabelText(/Limit the tree/));
  fireEvent.click(screen.getByRole('button',{name:'Review my answer →'}));
  expect(screen.getByText('Correct choice.')).toBeInTheDocument();
  expect(screen.getByText('Preparation library · 14 guides')).toBeInTheDocument();
});
it('answer-shape starters insert each move and light it up', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  expect(screen.getByLabelText('Answer structure: 0 of 4 moves used')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/^Clarify/}));
  expect(screen.getByLabelText('Your answer')).toHaveValue('First, I would clarify ');
  fireEvent.click(screen.getByRole('button',{name:/^Verify/}));
  expect(screen.getByLabelText('Answer structure: 2 of 4 moves used')).toBeInTheDocument();
});
it('uses question-specific criteria when an override exists', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Search interview questions'),{target:{value:'tree with no depth limit'}});
  fireEvent.click(screen.getByRole('button',{name:/tree with no depth limit/}));
  fireEvent.click(screen.getByLabelText(/Limit the tree/));
  fireEvent.click(screen.getByRole('button',{name:'Review my answer →'}));
  expect(screen.getByText(/Names the 28-point train\/validation gap/)).toBeInTheDocument();
});

describe('microphone', () => {
  beforeEach(() => { FakeSpeech.starts = 0; (window as any).SpeechRecognition = FakeSpeech; vi.clearAllMocks(); });
  afterEach(() => { delete (window as any).SpeechRecognition; });
  const say = (text: string) => act(() => FakeSpeech.last.onresult({ results: [{ isFinal: true, 0: { transcript: text } }] }));
  it('keeps listening and keeps earlier words when the browser ends on silence', () => {
    render(<MemoryRouter><InterviewPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Answer with microphone'));
    say('first part');
    act(() => { vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000); FakeSpeech.last.onend(); });
    vi.restoreAllMocks();
    expect(FakeSpeech.starts).toBe(2);
    expect(screen.getByText('Stop microphone')).toBeInTheDocument();
    say('second part');
    expect(screen.getByLabelText('Your answer')).toHaveValue('first part second part');
    fireEvent.click(screen.getByText('Stop microphone'));
    expect(FakeSpeech.starts).toBe(2);
    expect(screen.getByText('Answer with microphone')).toBeInTheDocument();
  });
  it('falls back to on-device transcription when the speech service fails', async () => {
    engine.startRecording.mockResolvedValue({ stop: async () => ({ audio: new Float32Array(1), seconds: 1 }), cancel: vi.fn() });
    engine.initEngine.mockResolvedValue(true);
    engine.transcribe.mockResolvedValue('spoken answer');
    render(<MemoryRouter><InterviewPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Answer with microphone'));
    act(() => { FakeSpeech.last.onerror({ error: 'network' }); FakeSpeech.last.onend(); });
    await screen.findByText(/Recording on this device/);
    fireEvent.click(screen.getByText('Stop microphone'));
    await waitFor(() => expect(screen.getByLabelText('Your answer')).toHaveValue('spoken answer'));
  });
  it('explains a blocked microphone', () => {
    render(<MemoryRouter><InterviewPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Answer with microphone'));
    act(() => { FakeSpeech.last.onerror({ error: 'not-allowed' }); FakeSpeech.last.onend(); });
    expect(screen.getByRole('status')).toHaveTextContent('microphone is blocked');
    expect(engine.startRecording).not.toHaveBeenCalled();
  });
});

it('exposes the software architecture bank with specific criteria and its teaching route', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Topic'), {target:{value:'software-system-design-questions'}});
  fireEvent.change(screen.getByLabelText('Search interview questions'), {target:{value:'Ten instances run at 60%'}});
  fireEvent.click(screen.getByRole('button', {name:/Ten instances run at 60%/}));
  expect(screen.getByText(/Peak traffic is 6,000 requests/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your answer'), {target:{value:'Six survivors run at 100%; fourteen instances retain nine survivors at 66.7%.'}});
  fireEvent.click(screen.getByRole('button', {name:'Review my answer →'}));
  expect(screen.getByText('Computes six surviving instances after the largest-zone failure.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/original study guide/})).toHaveAttribute('href','/docs/software-system-design/foundations');
});
