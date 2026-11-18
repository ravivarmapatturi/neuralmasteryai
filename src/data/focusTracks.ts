export interface FocusTrack {
  id: string;
  title: string;
  artist: string;
  description: string;
  src: string;
  durationEstimate: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}
export const FOCUS_TRACKS: FocusTrack[] = [
  { id: 'bamboo-flute', title: 'Bamboo flute, guzheng & erhu', artist: 'Instrumental collection', description: 'Bamboo flute, guzheng and erhu in a long, uninterrupted instrumental collection.', src: '/audio/bamboo-collection.mp3', durationEstimate: '1 hr 46 min · loops', sourceUrl: '/audio/ATTRIBUTION.md', license: 'Provided collection', licenseUrl: '/audio/ATTRIBUTION.md' },
  { id: 'lofi-study', title: '1 A.M. study session', artist: 'Lo-fi hip hop mix', description: 'An hour of slow lo-fi hip hop beats for reading and coding.', src: '/audio/lofi-study-session.mp3', durationEstimate: '1 hr · loops', sourceUrl: '/audio/ATTRIBUTION.md', license: 'Provided recording', licenseUrl: '/audio/ATTRIBUTION.md' },
  { id: 'rain', title: 'Relaxing rain', artist: 'Meditation music with rain sounds', description: 'Soft meditation music over steady rain. Start at a low volume and adjust for comfort.', src: '/audio/rain-meditation.mp3', durationEstimate: '1 hr 9 min · loops', sourceUrl: '/audio/ATTRIBUTION.md', license: 'Provided recording', licenseUrl: '/audio/ATTRIBUTION.md' },
];
