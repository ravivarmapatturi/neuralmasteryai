export interface FocusTrack {
  id: string;
  title: string;
  artist: string;
  description: string;
  src: string;
  durationEstimate: string;
}

export const FOCUS_TRACKS: FocusTrack[] = [
  {
    id: 'lofi-study',
    title: 'Lo-Fi Study Beats',
    artist: 'Neural Mastery',
    description: 'Chill 75 BPM lo-fi hip hop with warm Rhodes chords, gentle kicks, and vinyl crackle.',
    src: '/audio/lofi-study.wav',
    durationEstimate: 'Continuous Lo-Fi Beat',
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus (432Hz)',
    artist: 'Neural Mastery',
    description: 'Warm 432Hz ambient harmonic drone designed for spatial focus and deep reading.',
    src: '/audio/deep-focus.wav',
    durationEstimate: 'Continuous Ambient Drone',
  },
  {
    id: 'late-night',
    title: 'Late Night Coding',
    artist: 'Neural Mastery',
    description: 'Slow-tempo lo-fi groove with sub-bass and gentle tape saturation for debugging.',
    src: '/audio/late-night.wav',
    durationEstimate: 'Continuous Chill Groove',
  },
  {
    id: 'chill-study',
    title: 'Chill Study Flow',
    artist: 'Neural Mastery',
    description: '10Hz alpha-wave binaural study pad to maintain calm mental endurance.',
    src: '/audio/chill-study.wav',
    durationEstimate: 'Binaural Flow Pad',
  },
];
