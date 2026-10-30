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
    id: 'deep-focus',
    title: 'Deep Focus',
    artist: 'Neural Mastery',
    description: 'Warm 432Hz ambient chord progression designed for deep architectural study.',
    src: '/audio/deep-focus.wav',
    durationEstimate: 'Continuous Ambient Loop',
  },
  {
    id: 'neural-flow',
    title: 'Neural Flow',
    artist: 'Neural Mastery',
    description: 'Minimal algorithmic drone with sub-bass grounding and gentle harmonics.',
    src: '/audio/neural-flow.wav',
    durationEstimate: 'Continuous Ambient Loop',
  },
  {
    id: 'late-night',
    title: 'Late Night Systems',
    artist: 'Neural Mastery',
    description: 'Muffled low-pass lo-fi textures for quiet late-night debugging sessions.',
    src: '/audio/late-night.wav',
    durationEstimate: 'Continuous Ambient Loop',
  },
];
