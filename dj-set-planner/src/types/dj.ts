export type CamelotCode =
  | '1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4A' | '4B'
  | '5A' | '5B' | '6A' | '6B' | '7A' | '7B' | '8A' | '8B'
  | '9A' | '9B' | '10A' | '10B' | '11A' | '11B' | '12A' | '12B';

export type EnergyCurveType =
  | 'ramp'
  | 'wave'
  | 'flatline'
  | 'festival'
  | 'parties'
  | 'journey'
  | 'cooldown';

export type TransitionType =
  | 'long_blend'
  | 'short_blend'
  | 'stem_blend'
  | 'drop_mix'
  | 'cold_cut'
  | 'echo_out'
  | 'filter_sweep'
  | 'reverb_wash'
  | 'backspin'
  | 'breakdown_blend';

export interface RekordboxTempoGrid {
  inizioSec: number; // Start time of the tempo grid in seconds
  bpm: number;       // Precise tempo
  metro: string;     // Time signature, e.g. "4/4"
  battito: number;   // Beat number within bar (1, 2, 3, or 4)
}

export interface RekordboxPositionMark {
  name: string;      // e.g. "Intro", "Vocal", "Drop", "Breakdown", "Outro", "Instrumental"
  type: number;      // 0 = Hot Cue, 1 = Fade-In, 2 = Fade-Out, 3 = Load, 4 = Loop
  startSec: number;  // 64-bit float timestamp in seconds
  endSec?: number;   // Optional end timestamp in seconds
  num: number;       // -1 = Memory Cue, >= 0 = Hot Cue pad index
  beatIndex?: number;
  durationBeats?: number;
}

export interface DJTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;              // e.g. "8A", "Am", "C"
  camelot: CamelotCode;     // normalized Camelot string
  energy: number;           // 0.0 - 1.0
  durationSec: number;      // track duration in seconds
  source: 'rekordbox_xml' | 'm3u' | 'text_spotify';
  genre?: string;           // e.g. "Tech House", "Melodic Techno", "UK Garage"
  label?: string;           // e.g. "Afterlife", "Defected", "Toolroom"
  remixer?: string;         // e.g. "CamelPhat Extended Remix"
  mix?: string;             // e.g. "Extended Mix", "Club Mix", "Radio Edit"
  comments?: string;        // e.g. "Energy 8 - Vocal - Peak"
  colour?: string;          // Rekordbox hex colour code (e.g. "0xFF0000" red/peak, "0x0000FF" blue/warmup)
  tempoGrid?: RekordboxTempoGrid;
  positionMarks?: RekordboxPositionMark[];
  introBeats?: number;      // Phrase length of Intro in beats (from <POSITION_MARK> & <TEMPO>)
  outroBeats?: number;      // Phrase length of Outro in beats
  hasInstrumentalIntro?: boolean;
  hasInstrumentalOutro?: boolean;
  hasBreakdownCue?: boolean;
  instrumentalness?: number; // 0.0 - 1.0 (> 0.5 = instrumental, < 0.5 = vocal presence)
  speechiness?: number;      // 0.0 - 1.0 (> 0.33 = layered speech/vocals)
  valence?: number;          // 0.0 - 1.0 (0.1 = dark/industrial, 0.9 = euphoric/happy)
  danceability?: number;     // 0.0 - 1.0 (groove regularity & beat strength)
  targetLufs?: number;       // EBU R128 loudness target (default -14.0 LUFS Club Standard)
  filePath?: string;
  spotifyId?: string;
}

export interface TransitionEvaluation {
  fromTrackId: string;
  toTrackId: string;
  harmonicScore: number;        // 0 to 10
  genreScore: number;           // 0 to 10
  bpmDelta: number;             // difference in BPM
  pitchShiftPct: number;        // percentage pitch shift required (|BPM_B - BPM_A| / BPM_A * 100)
  isPitchDanger: boolean;       // > 4% pitch shift warning (approaches +1 semitone without Keylock)
  isTempoCompatible: boolean;   // within threshold or double/half time
  transitionType: TransitionType;
  transitionTypeName: string;
  isHarmonicClash: boolean;     // Key Distance < 7.0/10 (TIS sensory dissonance)
  isGenreClash: boolean;        // Distance 3 severe genre clash
  isGenrePivot: boolean;        // Distance 1-2 genre bridge/pivot
  isVocalClash: boolean;        // Both tracks have prominent overlapping vocals
  isEnergyBoost: boolean;       // +2 or +7 jump
  valenceDelta: number;         // |A_valence - B_valence| mood shift
  modulationType?: string;      // e.g. "Perfect Match", "Diagonal Major", "Mood Switch (+4)"
  phraseAlignmentInstruction?: string; // Exact beat handoff from <POSITION_MARK> & <TEMPO>
  eqAutomationInstruction?: string;    // Subtractive EQ rule, Phrase Bass Swap, or HPF Handoff
  crossfaderCurve?: 'Constant Power (Smooth)' | 'Sharp Cut (Instant 1mm)';
  stemDirective?: string;              // AI Stem Separation directive when vocal clash is resolved via stems
  gainStagingNote?: string;            // EBU R128 (-14 LUFS / -1 dBTP True Peak)
  energyShiftLabel: string;
  atmosphericNote: string;
  isSavedMemory?: boolean;      // learned from DJ's personal memory
  customDJNote?: string;
}

export interface SavedTransition {
  id: string;
  fromSignature: string;        // "Artist - Title"
  toSignature: string;          // "Artist - Title"
  transitionType: TransitionType;
  cueNote?: string;
  affinityScore: number;        // 1 - 5 stars
  savedAt: string;
}

export interface SetPlanConfig {
  targetDurationMinutes: number; // e.g. 60
  curveType: EnergyCurveType;
  prioritizeSavedMemory: boolean;
  strictHarmonic: boolean;
  averageTrackDurationMinutes: number; // e.g. 3.5
}
