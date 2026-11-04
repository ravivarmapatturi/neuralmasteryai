import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playInterviewerAudio } from './voiceAudio';

describe('playInterviewerAudio', () => {
  let originalAudio: any;
  let originalSpeechSynthesis: any;

  beforeEach(() => {
    originalAudio = (window as any).Audio;
    originalSpeechSynthesis = (window as any).speechSynthesis;
  });

  afterEach(() => {
    (window as any).Audio = originalAudio;
    (window as any).speechSynthesis = originalSpeechSynthesis;
    vi.restoreAllMocks();
  });

  it('attempts to play static opus clip when Audio is supported', () => {
    let playedUrl = '';
    let instance: any = null;

    (window as any).Audio = class MockAudio {
      src: string;
      onended: any = null;
      onerror: any = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      constructor(url: string) {
        this.src = url;
        playedUrl = url;
        instance = this;
      }
    };

    const onDone = vi.fn();
    const cancel = playInterviewerAudio({
      clipId: 'genai-fm-fundamentals_q',
      fallbackText: 'Test question',
      onDone,
    });

    expect(playedUrl).toBe('/audio/interview-voice/genai-fm-fundamentals_q.opus');
    expect(instance.play).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();

    // Trigger clip completion
    instance.onended();
    expect(onDone).toHaveBeenCalledTimes(1);

    cancel();
  });

  it('plays sequential clips in order (e.g. transition then question)', () => {
    const playedUrls: string[] = [];
    const mockInstances: any[] = [];

    (window as any).Audio = class MockAudio {
      src: string;
      onended: any = null;
      onerror: any = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      constructor(url: string) {
        this.src = url;
        playedUrls.push(url);
        mockInstances.push(this);
      }
    };

    const onDone = vi.fn();
    playInterviewerAudio({
      clipIds: ['transition_01', 'genai-fm-fundamentals_q'],
      fallbackText: 'Transition and question',
      onDone,
    });

    expect(playedUrls).toEqual(['/audio/interview-voice/transition_01.opus']);
    expect(onDone).not.toHaveBeenCalled();

    // End first clip -> starts second clip
    mockInstances[0].onended();
    expect(playedUrls).toEqual([
      '/audio/interview-voice/transition_01.opus',
      '/audio/interview-voice/genai-fm-fundamentals_q.opus',
    ]);
    expect(onDone).not.toHaveBeenCalled();

    // End second clip -> triggers onDone
    mockInstances[1].onended();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('falls back seamlessly to SpeechSynthesis when audio playback fails', async () => {
    (window as any).Audio = class MockAudio {
      src: string;
      onended: any = null;
      onerror: any = null;
      play = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));
      pause = vi.fn();
      constructor(url: string) {
        this.src = url;
      }
    };

    const speakMock = vi.fn();
    const cancelMock = vi.fn();
    (window as any).speechSynthesis = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([]),
    };
    (window as any).SpeechSynthesisUtterance = class MockUtterance {
      text: string;
      voice: any = null;
      lang: string = 'en-US';
      rate: number = 1;
      onend: any = null;
      onerror: any = null;
      constructor(text: string) {
        this.text = text;
      }
    };

    const onDone = vi.fn();
    playInterviewerAudio({
      clipId: 'genai-fm-fundamentals_q',
      fallbackText: 'What is a foundation model?',
      onDone,
    });

    // Wait a tick for rejected promise handler
    await new Promise((r) => setTimeout(r, 10));

    // Audio play rejected -> falls back to speech synthesis speak
    expect(speakMock).toHaveBeenCalled();
  });

  it('halts playback and synthesis immediately when cancelled', () => {
    let instance: any = null;
    (window as any).Audio = class MockAudio {
      src: string;
      onended: any = null;
      onerror: any = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      constructor(url: string) {
        this.src = url;
        instance = this;
      }
    };

    const cancelMock = vi.fn();
    (window as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([]),
    };

    const onDone = vi.fn();
    const cancel = playInterviewerAudio({
      clipId: 'genai-fm-fundamentals_q',
      fallbackText: 'What is a foundation model?',
      onDone,
    });

    cancel();
    expect(instance.pause).toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalled();
  });
});
