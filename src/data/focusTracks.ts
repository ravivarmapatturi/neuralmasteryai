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
  { id: 'bamboo-flute', title: 'Bamboo flute, guzheng & erhu', artist: 'Instrumental collection', description: 'Bamboo flute, guzheng and erhu in a long, uninterrupted instrumental collection.', src: '/audio/bamboo-collection.m4a', durationEstimate: '3 hr 18 min · loops', sourceUrl: '/audio/ATTRIBUTION.md', license: 'Provided collection', licenseUrl: '/audio/ATTRIBUTION.md' },
  { id: 'lofi-study', title: 'Cloud Watching', artist: 'Purrple Cat', description: 'Gentle instrumental lo-fi from Indigo Dreams (2019).', src: '/audio/cloud-watching.ogg', durationEstimate: '2:48 · loops', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Purrple_Cat_-_Cloud_Watching.ogg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  { id: 'white-noise', title: 'White noise', artist: 'Wikimedia Commons · Zginder', description: 'Steady broadband noise. Start at a low volume and adjust for comfort.', src: '/audio/white-noise.ogg', durationEstimate: '10-second sample · loops', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Whitenoisesound.ogg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File:Whitenoisesound.ogg' },
];
