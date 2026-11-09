import { DJTrack, EnergyCurveType, SavedTransition } from '@/types/dj';
import { evaluateTransition } from '../musical/transitionScorer';
import { isFourOnTheFloorGenre, resolveCanonicalGenre } from '../musical/genreGraph';

// Hyperparameters summing to 1.0 (Section 9.1 Multi-Objective Cost Function)
const ALPHA_HARMONIC = 0.24;
const BETA_TEMPO = 0.16;
const GAMMA_ENERGY = 0.18;
const DELTA_VOCAL_MOOD = 0.14;
const EPSILON_GENRE = 0.18;
const ZETA_FATIGUE_MEMORY = 0.10;

// Section 8.1: Target energy value at normalized position t (0.0 to 1.0) along the set
export function getTargetEnergy(curveType: EnergyCurveType, t: number): number {
  switch (curveType) {
    case 'ramp':
      // 3. The Ramp Up: monotonic increase from 0.40 to 0.95
      return 0.40 + 0.55 * t;

    case 'wave':
      // 2. The Wave (Oscillating): alternates between peaks and valleys (0.50 to 0.90)
      return 0.70 + 0.20 * Math.sin(t * Math.PI * 3.5);

    case 'flatline':
      // Steady hypnotic Lounge / Warm-Up groove around 0.55
      return 0.55;

    case 'festival':
      // 4. Peak Time (Flatline High): relentless 0.85 - 0.98 energy arc
      return 0.85 + 0.10 * Math.sin(t * Math.PI);

    case 'parties': {
      // PARTIES: First 1/3 steady ramp (0.40 -> 0.68), remaining 2/3 upward-trending wave
      if (t <= 1 / 3) {
        return 0.40 + 0.28 * (t / (1 / 3));
      }
      const u = (t - 1 / 3) / (2 / 3);
      const upwardTrend = 0.68 + 0.18 * u;
      const waveOscillation = 0.13 * Math.sin(u * Math.PI * 3.5);
      return Math.min(0.98, Math.max(0.45, upwardTrend + waveOscillation));
    }

    case 'journey':
      // 1. The Journey (Bell Curve): starts at 0.38, peaks at 0.95 in middle third, winds down to 0.44
      return 0.38 + 0.57 * Math.sin(t * Math.PI);

    case 'cooldown':
      // 5. The Cool-Down: gradual descent from 0.92 high energy down to 0.40 ambient
      return 0.92 - 0.52 * t;

    default:
      return 0.65;
  }
}

interface BeamNode {
  sequence: DJTrack[];
  unvisited: DJTrack[];
  cost: number;
}

/**
 * Multi-Path Lookahead (Beam Search K=25) + 2-Opt / Swap Local Refinement
 * Upgrading Layer B & Layer C with the 6-Term Multi-Objective Cost Function:
 * C(i, j, t) = αH(i, j) + βT(i, j) + γE(j, t) + δV(i, j) + εG(i, j) + ζM(j, t)
 */
export function sequenceTracks(
  tracks: DJTrack[],
  curveType: EnergyCurveType,
  savedTransitions: SavedTransition[] = [],
  prioritizeSaved: boolean = true
): DJTrack[] {
  const n = tracks.length;
  if (n <= 1) return [...tracks];

  // Build lookup map for saved transitions
  const memoryMap = new Map<string, number>();
  if (prioritizeSaved && savedTransitions.length > 0) {
    for (const st of savedTransitions) {
      const key = `${st.fromSignature.toLowerCase()}>>>${st.toSignature.toLowerCase()}`;
      memoryMap.set(key, st.affinityScore || 5);
    }
  }

  /**
   * Section 8.2: Moving-Window Fatigue and Monotony Penalties M(j, t)
   * Evaluates recent sequence history (t-4 to t-1) for Artist Fatigue, Key Monotony, & 4/4 Reset
   */
  function calcFatigueAndMemoryCost(
    historyPrefix: DJTrack[],
    from: DJTrack,
    to: DJTrack
  ): number {
    let fatiguePenalty = 0;

    // 1. Artist Fatigue Penalty (Section 8.2):
    // IF Count(Artist == X) in Last 3 Tracks > 0 THEN Cost += 5.0
    const recent3 = historyPrefix.slice(-3);
    const toArtistNorm = to.artist.trim().toLowerCase();
    const sameArtistInLast3 = recent3.some((prev) =>
      prev.artist.trim().toLowerCase().includes(toArtistNorm) ||
      toArtistNorm.includes(prev.artist.trim().toLowerCase())
    );
    if (sameArtistInLast3) {
      fatiguePenalty += 5.0;
    }

    // 2. Key Monotony Penalty (Section 8.2):
    // IF Count(Key == K) in Consecutive Sequence >= 3 THEN Force Modulation
    if (recent3.length >= 3 && recent3.every((prev) => prev.camelot === to.camelot)) {
      fatiguePenalty += 2.5;
    }

    // 3. The 4-on-the-Floor Reset (Section 8.2):
    // After 5 consecutive high-energy relentless 4/4 tracks, reward a rhythmic variation / palate cleanser
    const recent5 = historyPrefix.slice(-5);
    if (
      recent5.length >= 5 &&
      recent5.every((prev) => isFourOnTheFloorGenre(resolveCanonicalGenre(prev)) && prev.energy >= 0.78)
    ) {
      const toGenre = resolveCanonicalGenre(to);
      if (!isFourOnTheFloorGenre(toGenre) || to.energy < 0.72) {
        fatiguePenalty -= 0.4; // Palate cleanser bonus
      } else {
        fatiguePenalty += 0.35; // Slight fatigue penalty for relentless 4/4 without breathing room
      }
    }

    // 4. Saved Transition Memory Affinity Bonus
    const pairKey =
      `${from.artist} - ${from.title}`.toLowerCase() +
      '>>>' +
      `${to.artist} - ${to.title}`.toLowerCase();
    const savedAffinity = memoryMap.get(pairKey) || 0;
    if (savedAffinity > 0) {
      fatiguePenalty -= 18.0; // Strong override discount for user-verified transitions
    }

    return fatiguePenalty;
  }

  /**
   * Section 9.1: Multi-Objective Step Cost Function C(i, j, t)
   */
  function calcStepCost(
    from: DJTrack,
    to: DJTrack,
    t: number,
    historyPrefix: DJTrack[]
  ): number {
    const evalResult = evaluateTransition(from, to);
    const targetE = getTargetEnergy(curveType, t);

    // 1. H(i, j): Harmonic Cost (0.0 for 10/10, 0.15 for +2 Boost, 1.0+ for TIS Dissonance < 7.0)
    let harmonicCost = (10 - evalResult.harmonicScore) / 10;
    if (evalResult.isHarmonicClash) {
      harmonicCost += 0.45; // Section 5.3 TIS Dissonance penalty
    }

    // 2. T(i, j): Tempo Cost based on % Pitch Shift (Section 5.2: >4% heavily penalized)
    let tempoCost = evalResult.pitchShiftPct / 6.0;
    if (evalResult.isPitchDanger) {
      tempoCost += 0.85; // >4% pitch shift penalty
    } else if (evalResult.isTempoCompatible && Math.abs(to.bpm - from.bpm) > 25) {
      tempoCost = 0.22; // Clean half-time / double-time switch
    }

    // 3. E(j, t): Energy Deviation Cost from Macro-Topology curve
    const prevTargetE = getTargetEnergy(curveType, Math.max(0, t - 1 / Math.max(1, n - 1)));
    const isCurveRising = targetE > prevTargetE + 0.01;
    const directionPenalty =
      isCurveRising && to.energy < from.energy - 0.08 ? 0.25 : 0;
    const energyCost = Math.abs(to.energy - targetE) + directionPenalty;

    // 4. V(i, j): Vocal & Mood Clash Cost (Section 4.1 Vocal Avoidance + Section 4.2 Valence Delta)
    const vocalPenalty = evalResult.isVocalClash
      ? evalResult.transitionType === 'stem_blend'
        ? 0.25 // Mitigated if AI Stem Separation can isolate vocals
        : 0.90 // Heavy penalty if unmitigated vocal clash
      : 0.0;
    const valencePenalty = 0.65 * evalResult.valenceDelta; // Penalty_valence = w_v * |A_valence - B_valence|
    const vocalMoodCost = vocalPenalty + valencePenalty;

    // 5. G(i, j): Genre and Groove Pivot Cost from 3-Layer Genre Graph (Section 3.1)
    const genreCost = (10 - evalResult.genreScore) / 10;

    // 6. M(j, t): Moving-Window Fatigue and Memory Penalty (Section 8.2)
    const fatigueMemoryCost = calcFatigueAndMemoryCost(historyPrefix, from, to);

    return (
      ALPHA_HARMONIC * harmonicCost +
      BETA_TEMPO * tempoCost +
      GAMMA_ENERGY * energyCost +
      DELTA_VOCAL_MOOD * vocalMoodCost +
      EPSILON_GENRE * genreCost +
      ZETA_FATIGUE_MEMORY * fatigueMemoryCost
    );
  }

  // Total sequence objective function (used for final 2-Opt & swap refinement)
  function calcTotalSequenceCost(seq: DJTrack[]): number {
    const startTargetE = getTargetEnergy(curveType, 0);
    let total = Math.abs(seq[0].energy - startTargetE) * 0.5;

    // Track completed genre chapters to prevent ping-ponging back and forth between genres (Section 3.2)
    const completedGenres = new Set<string>();
    let currentBlockGenre = resolveCanonicalGenre(seq[0]);

    for (let i = 0; i < seq.length - 1; i++) {
      const t = (i + 1) / (seq.length - 1);
      const historyPrefix = seq.slice(0, i + 1);
      total += calcStepCost(seq[i], seq[i + 1], t, historyPrefix);

      const nextGenre = resolveCanonicalGenre(seq[i + 1]);
      if (nextGenre !== currentBlockGenre) {
        if (completedGenres.has(nextGenre)) {
          // Genre Chapter Ping-Pong Penalty (Section 3.2)
          total += 0.22;
        }
        completedGenres.add(currentBlockGenre);
        currentBlockGenre = nextGenre;
      }
    }
    return total;
  }

  // Stage 1: Seed Beam with top M starting tracks matching t=0 energy
  const BEAM_WIDTH = 25;
  const initialTargetEnergy = getTargetEnergy(curveType, 0);

  const startCandidates: BeamNode[] = tracks
    .map((track, idx) => {
      const unvisited = tracks.filter((_, i) => i !== idx);
      const startCost = Math.abs(track.energy - initialTargetEnergy) * 0.5;
      return {
        sequence: [track],
        unvisited,
        cost: startCost
      };
    })
    .sort((a, b) => a.cost - b.cost)
    .slice(0, Math.min(8, n));

  let beam: BeamNode[] = startCandidates;

  // Stage 2: Multi-Path Beam Search Expansion (Layer C)
  for (let step = 1; step < n; step++) {
    const t = step / (n - 1);
    const nextBeam: BeamNode[] = [];

    for (const node of beam) {
      const current = node.sequence[node.sequence.length - 1];

      for (let i = 0; i < node.unvisited.length; i++) {
        const candidate = node.unvisited[i];
        const stepCost = calcStepCost(current, candidate, t, node.sequence);

        // 1-step future lookahead: check best exit from `candidate` to remaining pool
        let futureLookaheadPenalty = 0;
        if (node.unvisited.length > 1) {
          let bestFutureExit = Infinity;
          const nextT = Math.min(1, (step + 1) / (n - 1));
          const nextHistory = [...node.sequence, candidate];
          for (let j = 0; j < node.unvisited.length; j++) {
            if (i === j) continue;
            const exitCost = calcStepCost(candidate, node.unvisited[j], nextT, nextHistory);
            if (exitCost < bestFutureExit) {
              bestFutureExit = exitCost;
            }
          }
          futureLookaheadPenalty = bestFutureExit * 0.15;
        }

        const remaining = node.unvisited.filter((_, idx) => idx !== i);
        nextBeam.push({
          sequence: [...node.sequence, candidate],
          unvisited: remaining,
          cost: node.cost + stepCost + futureLookaheadPenalty
        });
      }
    }

    // Keep top K paths with lowest cumulative + lookahead cost
    nextBeam.sort((a, b) => a.cost - b.cost);
    beam = nextBeam.slice(0, BEAM_WIDTH);
  }

  // Pick best path from beam according to true total sequence cost
  let bestSequence = beam[0].sequence;
  let bestCost = calcTotalSequenceCost(bestSequence);

  for (const node of beam) {
    const trueCost = calcTotalSequenceCost(node.sequence);
    if (trueCost < bestCost) {
      bestCost = trueCost;
      bestSequence = node.sequence;
    }
  }

  // Stage 3: 2-Opt & Pairwise Swap Local Refinement (Layer C)
  let improved = true;
  let iterations = 0;
  const MAX_ITERATIONS = 40;

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;

    // A) Test pairwise swaps
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const candidateSeq = [...bestSequence];
        const tmp = candidateSeq[i];
        candidateSeq[i] = candidateSeq[j];
        candidateSeq[j] = tmp;

        const candidateCost = calcTotalSequenceCost(candidateSeq);
        if (candidateCost + 1e-6 < bestCost) {
          bestSequence = candidateSeq;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }

    // B) Test 2-Opt segment reversals (for segments of length 3 to 6)
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < Math.min(n, i + 6); j++) {
        const candidateSeq = [
          ...bestSequence.slice(0, i),
          ...bestSequence.slice(i, j + 1).reverse(),
          ...bestSequence.slice(j + 1)
        ];

        const candidateCost = calcTotalSequenceCost(candidateSeq);
        if (candidateCost + 1e-6 < bestCost) {
          bestSequence = candidateSeq;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }

  return bestSequence;
}
