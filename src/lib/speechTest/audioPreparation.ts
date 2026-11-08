/** Bounded gain for quiet windows. Preserve silence, peaks and the original recording. */
export function normalizeQuietAudio(samples: Float32Array): Float32Array {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  // Do not amplify digital silence or already audible audio. Cap gain at 8x.
  if (peak < 0.0005 || peak >= 0.1) return samples.slice();
  const gain = Math.min(8, 0.1 / peak);
  return Float32Array.from(samples, sample => sample * gain);
}

/** A speech pause does not imply repeated words; deduplicate only known overlap. */
export function appendPhrase(previous: string, next: string): string {
  return [previous.trim(), next.trim()].filter(Boolean).join(' ');
}

export const INTERVIEW_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: { ideal: 1 },
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  // The AudioContext performs band-limited conversion to 16 kHz. Do not drop samples.
  sampleRate: { ideal: 16000 },
};

/** A final decoder has no calibrated confidence score. Do not silently accept
 * an empty result or a severe collapse of an established, substantive answer.
 * The 65% word-count floor is a completeness heuristic, not a correctness score.
 */
export function chooseFinalTranscript(live: string, candidate: string): { text: string; accepted: boolean; warning?: string } {
  const count = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const liveWords = count(live);
  const candidateWords = count(candidate);
  if (!candidateWords || (liveWords >= 20 && candidateWords < liveWords * 0.65)) {
    return { text: live.trim(), accepted: false, warning: 'The final speech check was incomplete; retained the live transcript.' };
  }
  return { text: candidate.trim(), accepted: true };
}
