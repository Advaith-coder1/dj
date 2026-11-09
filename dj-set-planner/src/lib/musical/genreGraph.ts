import { DJTrack } from '@/types/dj';

export type CanonicalGenre =
  | 'Deep House'
  | 'Afro House'
  | 'Tech House'
  | 'Bass House'
  | 'Progressive House'
  | 'Melodic Techno'
  | 'Peak Techno'
  | 'Trance'
  | 'UK Garage / Breaks'
  | 'Dubstep / Bass'
  | 'Drum & Bass'
  | 'Disco / Funk'
  | 'Hip-Hop / R&B'
  | 'Afrobeats / Latin'
  | 'Pop / Mainstage';

// Record Label -> Sub-Genre knowledge base (Table 2.1)
const LABEL_TO_GENRE: Record<string, CanonicalGenre> = {
  afterlife: 'Melodic Techno',
  anjunadeep: 'Melodic Techno',
  anjunabeats: 'Progressive House',
  pryda: 'Progressive House',
  'pryda presents': 'Progressive House',
  defected: 'Deep House',
  'sweat it out': 'Deep House',
  glitterbox: 'Disco / Funk',
  toolroom: 'Tech House',
  'catch & release': 'Tech House',
  solid: 'Tech House',
  dirtybird: 'Tech House',
  repopulate: 'Tech House',
  drumcode: 'Peak Techno',
  'kneaded pains': 'Peak Techno',
  'ninja tune': 'UK Garage / Breaks',
  atlantic: 'Pop / Mainstage',
  columbia: 'Pop / Mainstage',
  owsla: 'Dubstep / Bass',
  hospital: 'Drum & Bass',
  'ram records': 'Drum & Bass',
  keinemusik: 'Afro House'
};

// Distance 1 edges: Compatible Bridge Sub-Genres sharing compatible pulse (Score: 8.5 / 10.0, Table 3.1)
const GENRE_DISTANCE_1: Record<CanonicalGenre, CanonicalGenre[]> = {
  'Deep House': ['Afro House', 'Tech House', 'Progressive House', 'Disco / Funk', 'Melodic Techno'],
  'Afro House': ['Deep House', 'Melodic Techno', 'Tech House', 'Afrobeats / Latin'],
  'Tech House': ['Deep House', 'Afro House', 'Bass House', 'Progressive House', 'Melodic Techno'],
  'Bass House': ['Tech House', 'Pop / Mainstage'],
  'Progressive House': ['Deep House', 'Melodic Techno', 'Tech House', 'Trance', 'Pop / Mainstage'],
  'Melodic Techno': ['Progressive House', 'Deep House', 'Afro House', 'Tech House', 'Peak Techno', 'Trance'],
  'Peak Techno': ['Melodic Techno', 'Tech House', 'Trance'],
  'Trance': ['Progressive House', 'Melodic Techno', 'Peak Techno', 'Pop / Mainstage'],
  'UK Garage / Breaks': ['Dubstep / Bass', 'Drum & Bass'],
  'Dubstep / Bass': ['UK Garage / Breaks', 'Drum & Bass', 'Hip-Hop / R&B'],
  'Drum & Bass': ['UK Garage / Breaks', 'Dubstep / Bass'],
  'Disco / Funk': ['Deep House', 'Tech House', 'Pop / Mainstage'],
  'Hip-Hop / R&B': ['Afrobeats / Latin', 'Dubstep / Bass', 'Pop / Mainstage'],
  'Afrobeats / Latin': ['Afro House', 'Hip-Hop / R&B', 'Pop / Mainstage'],
  'Pop / Mainstage': ['Progressive House', 'Bass House', 'Trance', 'Disco / Funk', 'Hip-Hop / R&B', 'Afrobeats / Latin']
};

// Distance 2 edges: Genre Pivots / Rhythmic Shifts (e.g. 4/4 House <-> Breakbeat / UKG, Score: 5.0 / 10.0, Table 3.1)
const GENRE_DISTANCE_2: Record<CanonicalGenre, CanonicalGenre[]> = {
  'Deep House': ['UK Garage / Breaks', 'Afrobeats / Latin', 'Pop / Mainstage'],
  'Afro House': ['UK Garage / Breaks', 'Disco / Funk', 'Progressive House'],
  'Tech House': ['UK Garage / Breaks', 'Peak Techno', 'Disco / Funk', 'Pop / Mainstage'],
  'Bass House': ['UK Garage / Breaks', 'Dubstep / Bass', 'Peak Techno', 'Progressive House'],
  'Progressive House': ['Peak Techno', 'Disco / Funk', 'UK Garage / Breaks'],
  'Melodic Techno': ['UK Garage / Breaks', 'Bass House'],
  'Peak Techno': ['Bass House', 'Progressive House', 'UK Garage / Breaks'],
  'Trance': ['Tech House', 'Deep House', 'UK Garage / Breaks'],
  'UK Garage / Breaks': ['Tech House', 'Deep House', 'Bass House', 'Melodic Techno', 'Hip-Hop / R&B', 'Afro House'],
  'Dubstep / Bass': ['Bass House', 'Tech House', 'Pop / Mainstage'],
  'Drum & Bass': ['Bass House', 'Peak Techno'],
  'Disco / Funk': ['Afro House', 'Hip-Hop / R&B', 'Afrobeats / Latin', 'Progressive House'],
  'Hip-Hop / R&B': ['Disco / Funk', 'UK Garage / Breaks', 'Afro House'],
  'Afrobeats / Latin': ['Deep House', 'Tech House', 'Disco / Funk', 'UK Garage / Breaks'],
  'Pop / Mainstage': ['Tech House', 'Deep House', 'Dubstep / Bass', 'UK Garage / Breaks']
};

// Infers canonical DJ genre from Genre, Label, Remixer, Comments, and Title (Section 2.1)
export function resolveCanonicalGenre(track: DJTrack): CanonicalGenre {
  // Remixer can override original artist's genre (Table 2.1)
  const remixerText = (track.remixer || '').toLowerCase();
  if (remixerText.includes('techno') || remixerText.includes('afterlife')) return 'Melodic Techno';
  if (remixerText.includes('tech house')) return 'Tech House';
  if (remixerText.includes('dnb') || remixerText.includes('drum & bass')) return 'Drum & Bass';

  const labelClean = (track.label || '').toLowerCase().trim();
  for (const [labelKey, mappedGenre] of Object.entries(LABEL_TO_GENRE)) {
    if (labelClean.includes(labelKey)) {
      return mappedGenre;
    }
  }

  const combined = [
    track.genre || '',
    track.remixer || '',
    track.comments || '',
    track.title || ''
  ]
    .join(' ')
    .toLowerCase();

  if (combined.includes('melodic techno') || combined.includes('indie dance')) return 'Melodic Techno';
  if (combined.includes('afro house') || combined.includes('organic house')) return 'Afro House';
  if (combined.includes('tech house')) return 'Tech House';
  if (combined.includes('bass house') || combined.includes('electro house')) return 'Bass House';
  if (combined.includes('progressive')) return 'Progressive House';
  if (combined.includes('deep house') || combined.includes('soulful')) return 'Deep House';
  if (combined.includes('techno') || combined.includes('hard techno') || combined.includes('acid')) return 'Peak Techno';
  if (combined.includes('trance') || combined.includes('eurodance')) return 'Trance';
  if (combined.includes('garage') || combined.includes('ukg') || combined.includes('breakbeat') || combined.includes('breaks')) return 'UK Garage / Breaks';
  if (combined.includes('drum & bass') || combined.includes('dnb') || combined.includes('jungle')) return 'Drum & Bass';
  if (combined.includes('dubstep') || combined.includes('140') || combined.includes('grime') || combined.includes('bass')) return 'Dubstep / Bass';
  if (combined.includes('disco') || combined.includes('funk')) return 'Disco / Funk';
  if (combined.includes('hip-hop') || combined.includes('hip hop') || combined.includes('rap') || combined.includes('r&b') || combined.includes('trap')) return 'Hip-Hop / R&B';
  if (combined.includes('afrobeat') || combined.includes('reggaeton') || combined.includes('latin') || combined.includes('dembow')) return 'Afrobeats / Latin';
  if (combined.includes('house')) return 'Tech House';

  // Fallback by BPM range
  if (track.bpm >= 160) return 'Drum & Bass';
  if (track.bpm >= 136 && track.bpm <= 145) return 'Dubstep / Bass';
  if (track.bpm >= 131) return 'Trance';
  if (track.bpm < 115) return 'Hip-Hop / R&B';
  return 'Tech House';
}

// Section 8.2: Used to detect extended runs of relentless 4-on-the-floor beats
export function isFourOnTheFloorGenre(genre: CanonicalGenre): boolean {
  return (
    genre === 'Deep House' ||
    genre === 'Tech House' ||
    genre === 'Bass House' ||
    genre === 'Progressive House' ||
    genre === 'Melodic Techno' ||
    genre === 'Peak Techno' ||
    genre === 'Trance' ||
    genre === 'Disco / Funk'
  );
}

export function isRadioEditMix(track: DJTrack): boolean {
  const mixAndComments = `${track.mix || ''} ${track.title || ''} ${track.comments || ''}`.toLowerCase();
  return (
    mixAndComments.includes('radio edit') ||
    mixAndComments.includes('short edit') ||
    track.durationSec < 175
  );
}

/**
 * Section 3.1: Directed Genre Family Graph G = (V, E)
 * Returns exact Graph Distance (0, 1, 2, or 3) and Table 3.1 Algorithmic Score (10.0, 8.5, 5.0, or 2.0)
 */
export function evaluateGenreCompatibility(from: DJTrack, to: DJTrack): {
  fromGenre: CanonicalGenre;
  toGenre: CanonicalGenre;
  graphDistance: 0 | 1 | 2 | 3;
  score: number;         // 10.0, 8.5, 5.0, or 2.0
  sameLabel: boolean;
  isExactGenre: boolean;
  isBridgeGenre: boolean;
  isGenrePivot: boolean; // Distance >= 2 (triggers Section 3.2 Automatic Transition Override)
  isGenreClash: boolean; // Distance 3 (Severe Genre Clash)
} {
  const g1 = resolveCanonicalGenre(from);
  const g2 = resolveCanonicalGenre(to);

  const sameLabel = Boolean(
    from.label &&
      to.label &&
      from.label.trim().toLowerCase() === to.label.trim().toLowerCase()
  );

  // Distance 0: Exact Sub-Genre Match or identical Record Label (Table 3.1 -> 10.0 / 10.0)
  if (g1 === g2 || sameLabel) {
    return {
      fromGenre: g1,
      toGenre: g2,
      graphDistance: 0,
      score: 10.0,
      sameLabel,
      isExactGenre: true,
      isBridgeGenre: false,
      isGenrePivot: false,
      isGenreClash: false
    };
  }

  // Distance 1: Compatible Bridge Sub-Genre (Table 3.1 -> 8.5 / 10.0)
  const dist1Neighbors = GENRE_DISTANCE_1[g1] || [];
  if (dist1Neighbors.includes(g2)) {
    return {
      fromGenre: g1,
      toGenre: g2,
      graphDistance: 1,
      score: 8.5,
      sameLabel: false,
      isExactGenre: false,
      isBridgeGenre: true,
      isGenrePivot: false,
      isGenreClash: false
    };
  }

  // Distance 2: Genre Pivot / Rhythmic Shift (Table 3.1 -> 5.0 / 10.0)
  const dist2Neighbors = GENRE_DISTANCE_2[g1] || [];
  const isTwoHop =
    dist2Neighbors.includes(g2) ||
    dist1Neighbors.some((mid) => (GENRE_DISTANCE_1[mid] || []).includes(g2));

  if (isTwoHop) {
    return {
      fromGenre: g1,
      toGenre: g2,
      graphDistance: 2,
      score: 5.0,
      sameLabel: false,
      isExactGenre: false,
      isBridgeGenre: false,
      isGenrePivot: true,
      isGenreClash: false
    };
  }

  // Distance 3: Severe Genre Clash (Table 3.1 -> 2.0 / 10.0)
  return {
    fromGenre: g1,
    toGenre: g2,
    graphDistance: 3,
    score: 2.0,
    sameLabel: false,
    isExactGenre: false,
    isBridgeGenre: false,
    isGenrePivot: true,
    isGenreClash: true
  };
}
