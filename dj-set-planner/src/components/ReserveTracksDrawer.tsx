'use client';

import React from 'react';
import { DJTrack } from '@/types/dj';
import { Archive, Plus } from 'lucide-react';

interface Props {
  reserveTracks: DJTrack[];
  onAddBackToActive: (trackId: string) => void;
}

export default function ReserveTracksDrawer({ reserveTracks, onAddBackToActive }: Props) {
  if (reserveTracks.length === 0) return null;

  return (
    <div className="bg-[#121520] border border-[#22293d] rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#22293d]">
        <Archive className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Reserve Tracks Pool ({reserveTracks.length})
        </h3>
        <span className="text-[11px] text-zinc-500 ml-auto">
          Excluded by duration limit. Click (+) to swap back into active set.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {reserveTracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0f] border border-[#1b2033] hover:border-zinc-700 transition-all font-mono text-xs"
          >
            <div className="min-w-0 pr-2">
              <p className="text-zinc-200 font-bold truncate text-[11px]">{track.title}</p>
              <p className="text-zinc-500 truncate text-[10px]">{track.artist}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-[#161a29] text-[10px] text-cyan-400 font-bold">
                {track.bpm.toFixed(0)} BPM
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#161a29] text-[10px] text-amber-400 font-bold">
                {track.camelot}
              </span>
              <button
                onClick={() => onAddBackToActive(track.id)}
                title="Add to active playlist"
                className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded-md border border-cyan-500/40 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
