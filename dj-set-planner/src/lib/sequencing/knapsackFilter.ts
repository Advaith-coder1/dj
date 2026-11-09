import { DJTrack, EnergyCurveType } from '@/types/dj';
import { getTargetEnergy } from './tspOptimizer';

export interface SetPartition {
  activeTracks: DJTrack[];
  reserveTracks: DJTrack[];
  totalActiveDurationSec: number;
}

export function partitionTracksByDuration(
  tracks: DJTrack[],
  targetDurationMinutes: number,
  curveType: EnergyCurveType,
  avgTrackDurationMinutes: number = 3.5
): SetPartition {
  const targetDurationSec = targetDurationMinutes * 60;
  
  // Estimate number of tracks needed:
  // e.g. 60 min set / 3.5 min avg = ~17-18 tracks
  const estimatedCount = Math.max(2, Math.round(targetDurationMinutes / avgTrackDurationMinutes));

  if (tracks.length <= estimatedCount) {
    const totalSec = tracks.reduce((acc, t) => acc + t.durationSec, 0);
    return {
      activeTracks: [...tracks],
      reserveTracks: [],
      totalActiveDurationSec: totalSec
    };
  }

  // Score all tracks by how well their energy distribution covers the requested curve
  // Sample target curve points
  const sortedByEnergy = [...tracks].sort((a, b) => a.energy - b.energy);
  const active: DJTrack[] = [];
  const reserve: DJTrack[] = [];

  // Pick tracks that evenly sample the energy envelope
  const step = sortedByEnergy.length / estimatedCount;
  const pickedIndices = new Set<number>();

  for (let i = 0; i < estimatedCount; i++) {
    const targetIdx = Math.min(sortedByEnergy.length - 1, Math.floor(i * step));
    // Find closest unpicked
    let actualIdx = targetIdx;
    while (pickedIndices.has(actualIdx) && actualIdx < sortedByEnergy.length - 1) {
      actualIdx++;
    }
    pickedIndices.add(actualIdx);
  }

  sortedByEnergy.forEach((track, idx) => {
    if (pickedIndices.has(idx)) {
      active.push(track);
    } else {
      reserve.push(track);
    }
  });

  const totalSec = active.reduce((acc, t) => acc + t.durationSec, 0);

  return {
    activeTracks: active,
    reserveTracks: reserve,
    totalActiveDurationSec: totalSec
  };
}
