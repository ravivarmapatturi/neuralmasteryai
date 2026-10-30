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
    title: 'Lo-Fi Chill Study Beats',
    artist: 'Neural Mastery',
    description: 'Chill 75 BPM lo-fi hip hop with warm Rhodes piano chords, gentle kicks, and tape crackle.',
    src: '/audio/lofi-study.wav',
    durationEstimate: 'Continuous Lo-Fi Beat',
  },
  {
    id: 'bamboo-flute',
    title: 'Chinese Bamboo Flute & Guzheng',
    artist: 'Traditional Asian Strings & Flute',
    description: 'Authentic relaxing Chinese bamboo flute (Dizi), guzheng, and erhu for deep calm, focus, and study.',
    src: '/audio/bamboo-flute.mp3',
    durationEstimate: '10 Min Flow Loop',
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
];

