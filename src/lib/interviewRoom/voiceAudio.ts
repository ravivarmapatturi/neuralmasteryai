// Pre-recorded interviewer audio player with graceful speech-synthesis fallback.
// Serves static .opus files generated via Kokoro-82M INT8 (am_michael voice).

export interface PlayClipOptions {
  clipId?: string;
  clipIds?: string[];
  fallbackText: string;
  onDone: () => void;
  onActiveAudio?: (audio: HTMLAudioElement | null) => void;
}

/**
 * Plays pre-recorded static audio clips sequentially.
 * If any clip fails to load or cannot be played (e.g. autoplay block or missing codec),
 * seamlessly falls back to browser SpeechSynthesis.
 * Returns a cancel function that immediately halts all playback and synthesis.
 */
export function playInterviewerAudio(options: PlayClipOptions): () => void {
  const { clipId, clipIds = [], fallbackText, onDone, onActiveAudio } = options;
  const clipsToPlay = clipIds.length > 0 ? clipIds : clipId ? [clipId] : [];

  let cancelled = false;
  let currentAudio: HTMLAudioElement | null = null;
  let currentIndex = 0;

  const cancel = () => {
    cancelled = true;
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.src = '';
      } catch {}
      currentAudio = null;
      onActiveAudio?.(null);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  };

  const playBrowserSpeechFallback = () => {
    if (cancelled) return;
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      onDone();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(fallbackText);
      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith('en-in') || /india/i.test(v.name)
      );
      const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      const voice = inVoice || enVoice;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'en-US';
      }
      u.rate = 0.98;

      let finished = false;
      const complete = () => {
        if (!finished && !cancelled) {
          finished = true;
          onDone();
        }
      };

      u.onend = complete;
      u.onerror = complete;
      window.speechSynthesis.speak(u);
      setTimeout(complete, Math.max(3500, fallbackText.split(' ').length * 500));
    } catch {
      if (!cancelled) onDone();
    }
  };

  const AudioCtor =
    typeof window !== 'undefined' && (window as any).Audio
      ? (window as any).Audio
      : typeof Audio !== 'undefined'
      ? Audio
      : null;

  if (clipsToPlay.length === 0 || !AudioCtor) {
    playBrowserSpeechFallback();
    return cancel;
  }

  const playNextClip = () => {
    if (cancelled) return;
    if (currentIndex >= clipsToPlay.length) {
      onActiveAudio?.(null);
      onDone();
      return;
    }

    const currentId = clipsToPlay[currentIndex];
    currentIndex++;

    const audioUrl = `/audio/interview-voice/${currentId}.opus`;
    try {
      const audio = new AudioCtor(audioUrl);
      currentAudio = audio;
      onActiveAudio?.(audio);

      let endedOrFailed = false;
      const handleEnd = () => {
        if (endedOrFailed || cancelled) return;
        endedOrFailed = true;
        playNextClip();
      };

      const handleError = () => {
        if (endedOrFailed || cancelled) return;
        endedOrFailed = true;
        // Pre-recorded audio clip could not be loaded or played; fallback to speech synthesis
        playBrowserSpeechFallback();
      };

      audio.onended = handleEnd;
      audio.onerror = handleError;

      audio.play().catch(() => {
        handleError();
      });
    } catch {
      playBrowserSpeechFallback();
    }
  };

  playNextClip();
  return cancel;
}
