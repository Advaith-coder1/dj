import { CamelotCode } from '@/types/dj';

// Map of standard pitch class / classical key notation to Camelot
const KEY_TO_CAMELOT: Record<string, CamelotCode> = {
  // Minor Keys (A)
  'abm': '1A', 'g#m': '1A', 'g# minor': '1A', 'ab minor': '1A',
  'ebm': '2A', 'd#m': '2A', 'eb minor': '2A', 'd# minor': '2A',
  'bbm': '3A', 'a#m': '3A', 'bb minor': '3A', 'a# minor': '3A',
  'fm': '4A', 'f minor': '4A',
  'cm': '5A', 'c minor': '5A',
  'gm': '6A', 'g minor': '6A',
  'dm': '7A', 'd minor': '7A',
  'am': '8A', 'a minor': '8A',
  'em': '9A', 'e minor': '9A',
  'bm': '10A', 'b minor': '10A',
  'f#m': '11A', 'gbm': '11A', 'f# minor': '11A', 'gb minor': '11A',
  'c#m': '12A', 'dbm': '12A', 'c# minor': '12A', 'db minor': '12A',

  // Major Keys (B)
  'b': '1B', 'b major': '1B',
  'f#': '2B', 'gb': '2B', 'f# major': '2B', 'gb major': '2B',
  'c#': '3B', 'db': '3B', 'c# major': '3B', 'db major': '3B',
  'g#': '4B', 'ab': '4B', 'g# major': '4B', 'ab major': '4B',
  'd#': '5B', 'eb': '5B', 'd# major': '5B', 'eb major': '5B',
  'a#': '6B', 'bb': '6B', 'a# major': '6B', 'bb major': '6B',
  'f': '7B', 'f major': '7B',
  'c': '8B', 'c major': '8B',
  'g': '9B', 'g major': '9B',
  'd': '10B', 'd major': '10B',
  'a': '11B', 'a major': '11B',
  'e': '12B', 'e major': '12B',
};

// Spotify Pitch Class (0 = C, 1 = C#, 2 = D ... 11 = B) + Mode (0 = Minor, 1 = Major)
const SPOTIFY_PITCH_CLASS: Record<string, CamelotCode> = {
  // Minor (mode 0)
  '0_0': '5A',   // C Minor
  '1_0': '12A',  // C# Minor
  '2_0': '7A',   // D Minor
  '3_0': '2A',   // D# / Eb Minor
  '4_0': '9A',   // E Minor
  '5_0': '4A',   // F Minor
  '6_0': '11A',  // F# Minor
  '7_0': '6A',   // G Minor
  '8_0': '1A',   // G# / Ab Minor
  '9_0': '8A',   // A Minor
  '10_0': '3A',  // A# / Bb Minor
  '11_0': '10A', // B Minor

  // Major (mode 1)
  '0_1': '8B',   // C Major
  '1_1': '3B',   // C# Major
  '2_1': '10B',  // D Major
  '3_1': '5B',   // D# Major
  '4_1': '12B',  // E Major
  '5_1': '7B',   // F Major
  '6_1': '2B',   // F# Major
  '7_1': '9B',   // G Major
  '8_1': '4B',   // G# Major
  '9_1': '11B',  // A Major
  '10_1': '6B',  // A# / Bb Major
  '11_1': '1B',  // B Major
};

export function normalizeCamelot(rawKey: string): CamelotCode {
  if (!rawKey) return '8A';
  const clean = rawKey.trim().toUpperCase();

  // If already in Camelot format (e.g. "8A", "11B", "08A")
  const camelotMatch = clean.match(/^0?([1-9]|1[0-2])([AB])$/);
  if (camelotMatch) {
    return `${camelotMatch[1]}${camelotMatch[2]}` as CamelotCode;
  }

  // Lookup in text map
  const lower = rawKey.trim().toLowerCase();
  if (KEY_TO_CAMELOT[lower]) {
    return KEY_TO_CAMELOT[lower];
  }

  return '8A'; // default fallback
}

export function spotifyToCamelot(pitchClass: number, mode: number): CamelotCode {
  const key = `${pitchClass}_${mode}`;
  return SPOTIFY_PITCH_CLASS[key] || '8A';
}

export function parseCamelot(code: CamelotCode): { number: number; letter: 'A' | 'B' } {
  const num = parseInt(code.slice(0, -1), 10);
  const letter = code.slice(-1) as 'A' | 'B';
  return { number: num, letter };
}

/**
 * Expanded Camelot Modulation Matrix & Tonal Interval Space (TIS) Dissonance Check
 * (Section 5.1 & 5.3 of "Algorithmic Sequencing and Transition Optimization for Automated DJ Systems")
 */
export function getCamelotDistance(from: CamelotCode, to: CamelotCode): {
  stepDiff: number;        // Clockwise distance 0 - 11
  isSameLetter: boolean;
  isEnergyBoost: boolean;  // +2 (Whole Tone) or +7 (Semitone)
  isEnergyDrop: boolean;   // -2 (Whole Tone Down) or -7
  isDiagonalModulation: boolean; // +1 (B -> A) or -1 (A -> B)
  isMoodSwitch: boolean;   // +4 Major 3rd ("David Guetta Technique")
  isClash: boolean;        // Score < 7.0/10 (TIS Sensory Dissonance threshold)
  modulationType: string;
  score: number;           // 0 to 10
} {
  const c1 = parseCamelot(from);
  const c2 = parseCamelot(to);

  const isSameLetter = c1.letter === c2.letter;
  // Clockwise difference around 12-hour wheel
  const cwDiff = (c2.number - c1.number + 12) % 12;

  // 1. Perfect Match (0, Unison) -> 10.0 / 10.0
  if (cwDiff === 0 && isSameLetter) {
    return {
      stepDiff: 0,
      isSameLetter: true,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Perfect Match (Unison)',
      score: 10.0
    };
  }

  // 2. Adjacent (+1 or -1 on same ring, Perfect 5th / 4th) -> 9.5 / 10.0
  if (isSameLetter && (cwDiff === 1 || cwDiff === 11)) {
    return {
      stepDiff: cwDiff,
      isSameLetter: true,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: cwDiff === 1 ? 'Adjacent (+1 Fifth)' : 'Adjacent (-1 Fourth)',
      score: 9.5
    };
  }

  // 3. Relative Shift (0, A <-> B Relative Major/Minor) -> 9.0 / 10.0
  if (cwDiff === 0 && !isSameLetter) {
    return {
      stepDiff: 0,
      isSameLetter: false,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Relative Shift (A ↔ B)',
      score: 9.0
    };
  }

  // 4. Energy Boost Whole Tone (+2, Major 2nd) -> 8.5 / 10.0
  if (isSameLetter && cwDiff === 2) {
    return {
      stepDiff: 2,
      isSameLetter: true,
      isEnergyBoost: true,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Energy Boost (+2 Whole Tone)',
      score: 8.5
    };
  }

  // 5. Diagonal Major (+1, B -> A: Major to Minor subtle tension increase) -> 8.5 / 10.0
  if (!isSameLetter && c1.letter === 'B' && c2.letter === 'A' && cwDiff === 1) {
    return {
      stepDiff: 1,
      isSameLetter: false,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: true,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Diagonal Major (+1 B→A)',
      score: 8.5
    };
  }

  // 6. Diagonal Minor (-1, A -> B: Minor to Major subtle tension release & brightening) -> 8.5 / 10.0
  if (!isSameLetter && c1.letter === 'A' && c2.letter === 'B' && cwDiff === 11) {
    return {
      stepDiff: -1,
      isSameLetter: false,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: true,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Diagonal Minor (-1 A→B)',
      score: 8.5
    };
  }

  // 7. Energy Boost Semitone (+7, Minor 2nd / +1 Semitone lift) -> 8.0 / 10.0
  if (isSameLetter && cwDiff === 7) {
    return {
      stepDiff: 7,
      isSameLetter: true,
      isEnergyBoost: true,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Energy Boost (+7 Semitone)',
      score: 8.0
    };
  }

  // 8. Energy Drop (-2, Whole Tone Down deceleration / floor reset) -> 7.5 / 10.0
  if (isSameLetter && cwDiff === 10) {
    return {
      stepDiff: -2,
      isSameLetter: true,
      isEnergyBoost: false,
      isEnergyDrop: true,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: false,
      modulationType: 'Energy Drop (-2 Whole Tone Down)',
      score: 7.5
    };
  }

  // 9. Mood Switch (+4, Major 3rd "David Guetta Technique") -> 7.0 / 10.0
  if (isSameLetter && cwDiff === 4) {
    return {
      stepDiff: 4,
      isSameLetter: true,
      isEnergyBoost: false,
      isEnergyDrop: false,
      isDiagonalModulation: false,
      isMoodSwitch: true,
      isClash: false,
      modulationType: 'Mood Switch (+4 Major 3rd)',
      score: 7.0
    };
  }

  // 10. Semitone Drop (-7, cwDiff === 5) -> 6.5 / 10.0 (Below 7.0 TIS threshold -> flagged as clash for blends)
  if (isSameLetter && cwDiff === 5) {
    return {
      stepDiff: -7,
      isSameLetter: true,
      isEnergyBoost: false,
      isEnergyDrop: true,
      isDiagonalModulation: false,
      isMoodSwitch: false,
      isClash: true,
      modulationType: 'Semitone Drop (-7)',
      score: 6.5
    };
  }

  // 11. Tonal Interval Space (TIS) Sensory Dissonance Clash (< 7.0 / 10.0)
  return {
    stepDiff: cwDiff,
    isSameLetter,
    isEnergyBoost: false,
    isEnergyDrop: false,
    isDiagonalModulation: false,
    isMoodSwitch: false,
    isClash: true,
    modulationType: 'Sensory Dissonance (TIS Clash)',
    score: 2.0
  };
}
