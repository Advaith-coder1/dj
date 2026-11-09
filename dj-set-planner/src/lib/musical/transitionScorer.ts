import { DJTrack, TransitionEvaluation, TransitionType } from '@/types/dj';
import { getCamelotDistance } from './camelot';
import { evaluateGenreCompatibility, isRadioEditMix } from './genreGraph';

// Helper to infer vocal/mood metrics if not explicitly present on the track object
export function getTrackAcousticMetrics(track: DJTrack): {
  instrumentalness: number;
  speechiness: number;
  valence: number;
  danceability: number;
} {
  if (
    track.instrumentalness !== undefined &&
    track.speechiness !== undefined &&
    track.valence !== undefined
  ) {
    return {
      instrumentalness: track.instrumentalness,
      speechiness: track.speechiness,
      valence: track.valence,
      danceability: track.danceability ?? 0.8
    };
  }

  const text = `${track.title} ${track.comments || ''} ${track.mix || ''} ${track.genre || ''}`.toLowerCase();
  const hasVocalCue =
    /vocal|feat\.|ft\.|lyrics|rap|singer|radio edit|miracle|lights|sun & moon|cola/i.test(text) ||
    Boolean(track.positionMarks?.some((m) => /vocal|verse|chorus/i.test(m.name)));
  const hasInstCue = /instrumental|dub|extended|club tool|opus|glue/i.test(text);

  const instrumentalness =
    track.instrumentalness ?? (hasVocalCue ? 0.24 : hasInstCue ? 0.82 : 0.64);
  const speechiness =
    track.speechiness ??
    (/rap|flowdan|hip-hop|mc /i.test(text) ? 0.42 : hasVocalCue ? 0.35 : 0.08);

  let valence = track.valence ?? (track.camelot.endsWith('B') ? 0.72 : 0.42);
  if (/dark|industrial|acid|hypnotic|afterlife|drumcode|rumble/i.test(`${text} ${track.label || ''}`)) {
    valence = Math.max(0.12, valence - 0.22);
  } else if (/euphoric|uplifting|disco|funk|happy|anthem|miracle|sun/i.test(`${text} ${track.label || ''}`)) {
    valence = Math.min(0.92, valence + 0.22);
  }

  const danceability = track.danceability ?? (track.bpm >= 118 && track.bpm <= 132 ? 0.85 : 0.72);

  return { instrumentalness, speechiness, valence, danceability };
}

export function evaluateTransition(from: DJTrack, to: DJTrack): TransitionEvaluation {
  const camelotStats = getCamelotDistance(from.camelot, to.camelot);
  const genreStats = evaluateGenreCompatibility(from, to);
  const radioEditIncoming = isRadioEditMix(to);
  const metricsA = getTrackAcousticMetrics(from);
  const metricsB = getTrackAcousticMetrics(to);

  // Section 5.2: Pitch & Tempo Interdependence
  const rawBpmDiff = to.bpm - from.bpm;
  const absBpmDiff = Math.abs(rawBpmDiff);
  const isDoubleTime = Math.abs(to.bpm - from.bpm * 2) <= 3;
  const isHalfTime = Math.abs(to.bpm - from.bpm * 0.5) <= 3;

  const effectiveBpmDiff = isDoubleTime
    ? Math.abs(to.bpm - from.bpm * 2)
    : isHalfTime
    ? Math.abs(to.bpm - from.bpm * 0.5)
    : absBpmDiff;

  // Percentage pitch shift required (6% speed shift ~= 1 semitone / +7 on Camelot wheel)
  const pitchShiftPct = Math.round((effectiveBpmDiff / Math.max(1, from.bpm)) * 1000) / 10;
  const isPitchDanger = pitchShiftPct > 4.0;
  const isTempoCompatible = !isPitchDanger || isDoubleTime || isHalfTime;

  // Section 4.1: The Vocal Avoidance Rule
  const trackAHasVocals = metricsA.instrumentalness < 0.5 || metricsA.speechiness > 0.33;
  const trackBHasVocals = metricsB.instrumentalness < 0.5 || metricsB.speechiness > 0.33;
  const overlapIsExplicitlyInstrumental =
    Boolean(from.hasInstrumentalOutro) && Boolean(to.hasInstrumentalIntro);
  const isVocalClash =
    trackAHasVocals && trackBHasVocals && !overlapIsExplicitlyInstrumental;

  // Section 4.2: Valence Delta (emotional gradient consistency)
  const valenceDelta = Math.round(Math.abs(metricsA.valence - metricsB.valence) * 100) / 100;

  // Energy difference
  const energyDiff = to.energy - from.energy;

  // Default Layer A transition selection
  let transitionType = 'long_blend' as TransitionType;
  let transitionTypeName = '64B Long Blend';
  let energyShiftLabel = 'Steady Flow';
  let stemDirective: string | undefined = undefined;

  // 1. Section 5.3 Hard Rule: Tonal Interval Space (TIS) Sensory Dissonance (< 7.0 / 10.0)
  // Incompatible scales must strictly NEVER be blended
  if (camelotStats.score < 7.0) {
    if (absBpmDiff > 4 || genreStats.isGenrePivot) {
      transitionType = 'echo_out';
      transitionTypeName = 'Echo Cut (TIS Shield)';
      energyShiftLabel = 'Atmospheric Reset';
    } else {
      transitionType = 'cold_cut';
      transitionTypeName = 'Hard Cut (Beat 1)';
      energyShiftLabel = 'Downbeat Cut';
    }
  }
  // 2. Section 3.2 Hard Rule: Automatic Transition Override on Genre Pivots (Graph Distance >= 2)
  // Forbids 64B BLEND when steady 4/4 pulse is broken
  else if (genreStats.graphDistance >= 2) {
    if (from.hasBreakdownCue) {
      transitionType = 'breakdown_blend';
      transitionTypeName = 'Breakdown Swap';
      energyShiftLabel = 'Kick-Less Handoff';
    } else if (absBpmDiff > 3 || genreStats.graphDistance === 3) {
      transitionType = 'echo_out';
      transitionTypeName = 'Echo Cut (Pivot)';
      energyShiftLabel = 'Genre Pivot Echo';
    } else {
      transitionType = 'cold_cut';
      transitionTypeName = 'Hard Cut (Pivot)';
      energyShiftLabel = 'Genre Groove Switch';
    }
  }
  // 3. Section 4.1 & Section 7: Vocal Clash Override & AI Stem Separation
  else if (isVocalClash) {
    if (camelotStats.score >= 8.5 && !isPitchDanger && !radioEditIncoming) {
      transitionType = 'stem_blend';
      transitionTypeName = 'AI Stem Blend (64B)';
      energyShiftLabel = 'Stem Mashup';
      stemDirective =
        'TRANSITION_TYPE = STEM_BLEND_64B | MUTE(TrackB.VocalStem) FROM Beat 1 TO Beat 64 | SWAP(TrackA.BassStem, TrackB.BassStem) AT Beat 33';
    } else if (camelotStats.isEnergyBoost || energyDiff > 0.15) {
      transitionType = 'drop_mix';
      transitionTypeName = '⚡ Drop Mix (Vocal Cut)';
      energyShiftLabel = 'Vocal Handoff';
    } else {
      transitionType = 'echo_out';
      transitionTypeName = 'Echo Cut (Vocal Cut)';
      energyShiftLabel = 'Vocal Isolation';
    }
  }
  // 4. Radio Edit incoming -> requires immediate transition
  else if (radioEditIncoming) {
    transitionType = 'drop_mix';
    transitionTypeName = '⚡ Drop Mix (Radio)';
    energyShiftLabel = 'Quick Entry';
  }
  // 5. Section 5.1: Energy Boost (+2 Whole Tone or +7 Semitone) Override
  else if (camelotStats.isEnergyBoost) {
    if (energyDiff >= 0.08 || camelotStats.stepDiff === 7) {
      transitionType = 'drop_mix';
      transitionTypeName = `⚡ Drop Mix (+${camelotStats.stepDiff} Key)`;
      energyShiftLabel = '⚡ Power Lift';
    } else {
      transitionType = 'short_blend';
      transitionTypeName = '16B Short Blend (+2)';
      energyShiftLabel = '16B Jump';
    }
  }
  // 6. Section 5.1: Mood Switch (+4 "David Guetta Technique") or Diagonal Modulation
  else if (camelotStats.isMoodSwitch) {
    transitionType = 'short_blend';
    transitionTypeName = '16B Blend (+4 Mood)';
    energyShiftLabel = 'Major 3rd Shift';
  } else if (camelotStats.isDiagonalModulation) {
    transitionType = 'short_blend';
    transitionTypeName = '16B Diagonal Blend';
    energyShiftLabel = 'Diagonal Shift';
  }
  // 7. Energy Drop (-2 Whole Tone Down or steep cooldown)
  else if (camelotStats.isEnergyDrop || energyDiff < -0.2) {
    transitionType = 'reverb_wash';
    transitionTypeName = 'Reverb Washout';
    energyShiftLabel = 'Floor Reset';
  }
  // 8. Half-Time / Double-Time Switch
  else if (isDoubleTime || isHalfTime) {
    transitionType = 'cold_cut';
    transitionTypeName = 'Hard Cut (2x/0.5x)';
    energyShiftLabel = 'Half/Double Switch';
  }
  // 9. Relative Major/Minor Shift (8A <-> 8B)
  else if (camelotStats.stepDiff === 0 && !camelotStats.isSameLetter) {
    transitionType = 'breakdown_blend';
    transitionTypeName = 'Mode Swap (A ↔ B)';
    energyShiftLabel = 'Mode Shift';
  }
  // 10. Distance 1 Compatible Bridge Sub-Genre -> HPF Handoff (Section 6.1 Rule 3)
  else if (genreStats.graphDistance === 1) {
    transitionType = 'filter_sweep';
    transitionTypeName = 'HPF Bridge Sweep';
    energyShiftLabel = 'Sub-Genre Bridge';
  }

  // Section 2.2: Phrase-Locked Beat Alignment using <POSITION_MARK> & <TEMPO>
  const outroBeatsA = from.outroBeats ?? 32;
  const introBeatsB = to.introBeats ?? 64;
  let phraseAlignmentInstruction = `Align Beat 1 of Track B Intro (${introBeatsB}B) with Beat 1 of Track A Outro (${outroBeatsA}B).`;
  if (introBeatsB > outroBeatsA) {
    const startBeatOnB = introBeatsB - outroBeatsA + 1;
    phraseAlignmentInstruction = `Phrase Lock: Align Beat ${startBeatOnB} of Track B's ${introBeatsB}B Intro with Beat 1 of Track A's ${outroBeatsA}B Outro so Track B's Drop hits on Track A silence.`;
  } else if (outroBeatsA > introBeatsB) {
    const startBeatOnA = outroBeatsA - introBeatsB + 1;
    phraseAlignmentInstruction = `Phrase Lock: Start Track B's ${introBeatsB}B Intro on Beat ${startBeatOnA} of Track A's ${outroBeatsA}B Outro for synchronized Drop handoff.`;
  }

  // Section 6.1 & 6.2: Frequency-Domain EQ Automation & Crossfader Curve Geometry
  let eqAutomationInstruction =
    'Subtractive Rule: Track B Low EQ at 0% (-26dB) on entry -> Hard Phrase Bass Swap at Bar 9 / Beat 33 (Track A Low -> 0%, Track B Low -> 100%).';
  let crossfaderCurve: 'Constant Power (Smooth)' | 'Sharp Cut (Instant 1mm)' =
    'Constant Power (Smooth)';

  if (transitionType === 'drop_mix' || transitionType === 'cold_cut' || transitionType === 'backspin') {
    eqAutomationInstruction =
      'Instant Bass Swap on Beat 1: Snap Track A channel fader to 0% and open Track B at 100% Low EQ on the structural downbeat.';
    crossfaderCurve = 'Sharp Cut (Instant 1mm)';
  } else if (transitionType === 'filter_sweep' || genreStats.graphDistance === 1) {
    eqAutomationInstruction =
      'HPF Handoff: Sweep Track A High-Pass Filter upward (20 Hz -> 280 Hz) over 32 beats to strip outgoing sub-bass while fading Track B Low EQ to 100%.';
    crossfaderCurve = 'Constant Power (Smooth)';
  } else if (transitionType === 'stem_blend') {
    eqAutomationInstruction =
      'AI Stem Isolation: Mute Track B Vocal Stem for 64 beats; execute isolated Bass Stem Swap at Bar 9 (Beat 33).';
    crossfaderCurve = 'Constant Power (Smooth)';
  } else if (transitionType === 'short_blend') {
    eqAutomationInstruction =
      '16-Beat Phrase Swap: Enter Track B with Low EQ at 0% for 4 bars, then snap Bass Swap on Beat 17.';
    crossfaderCurve = 'Constant Power (Smooth)';
  }

  // Section 10: EBU R128 Gain Staging note
  const gainStagingNote =
    'EBU R128 Normalized (-14.0 LUFS Club Target | -1.0 dBTP True Peak Limiter Active)';

  // Build Compact Inline Atmospheric Note
  const notes: string[] = [];

  if (genreStats.isExactGenre) {
    notes.push(genreStats.sameLabel && to.label ? `${to.label} Lock` : `${genreStats.toGenre}`);
  } else if (genreStats.isBridgeGenre) {
    notes.push(`${genreStats.fromGenre} → ${genreStats.toGenre}`);
  } else if (genreStats.graphDistance === 2) {
    notes.push(`Pivot: ${genreStats.fromGenre} → ${genreStats.toGenre}`);
  } else if (genreStats.isGenreClash) {
    notes.push(`⚠️ Clash: ${genreStats.fromGenre} → ${genreStats.toGenre}`);
  }

  if (isVocalClash) {
    notes.push(transitionType === 'stem_blend' ? '🎙️ Stem Isolate' : '🎙️ Vocal Guard');
  }

  if (isPitchDanger) {
    notes.push(`⚠️ ${pitchShiftPct}% Pitch`);
  } else if (rawBpmDiff !== 0) {
    notes.push(`${rawBpmDiff > 0 ? '+' : ''}${rawBpmDiff.toFixed(0)} BPM`);
  }

  return {
    fromTrackId: from.id,
    toTrackId: to.id,
    harmonicScore: camelotStats.score,
    genreScore: genreStats.score,
    bpmDelta: rawBpmDiff,
    pitchShiftPct,
    isPitchDanger,
    isTempoCompatible,
    transitionType,
    transitionTypeName,
    isHarmonicClash: camelotStats.isClash,
    isGenreClash: genreStats.isGenreClash,
    isGenrePivot: genreStats.isGenrePivot || genreStats.isBridgeGenre,
    isVocalClash,
    isEnergyBoost: camelotStats.isEnergyBoost,
    valenceDelta,
    modulationType: camelotStats.modulationType,
    phraseAlignmentInstruction,
    eqAutomationInstruction,
    crossfaderCurve,
    stemDirective,
    gainStagingNote,
    energyShiftLabel,
    atmosphericNote: notes.join(' • ')
  };
}
