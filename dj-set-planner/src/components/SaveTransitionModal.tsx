'use client';

import React, { useState } from 'react';
import { DJTrack, TransitionEvaluation, TransitionType, SavedTransition } from '@/types/dj';
import { X, BookmarkPlus, Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fromTrack: DJTrack | null;
  toTrack: DJTrack | null;
  evalData: TransitionEvaluation | null;
  onSave: (saved: SavedTransition) => void;
}

export default function SaveTransitionModal({
  isOpen,
  onClose,
  fromTrack,
  toTrack,
  evalData,
  onSave
}: Props) {
  const [transitionType, setTransitionType] = useState<TransitionType>('drop_mix');
  const [cueNote, setCueNote] = useState('');
  const [affinityScore, setAffinityScore] = useState(5);

  if (!isOpen || !fromTrack || !toTrack || !evalData) return null;

  const handleSave = () => {
    const saved: SavedTransition = {
      id: `saved_${Date.now()}`,
      fromSignature: `${fromTrack.artist} - ${fromTrack.title}`,
      toSignature: `${toTrack.artist} - ${toTrack.title}`,
      transitionType,
      cueNote: cueNote.trim() || undefined,
      affinityScore,
      savedAt: new Date().toISOString()
    };
    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121520] border border-[#2d3752] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-[#22293d] pb-3">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-fuchsia-400" />
            <h3 className="text-base font-bold text-white">Save Signature Transition</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-[#090a0f] p-3 rounded-xl border border-[#1b2033] flex items-center justify-between">
            <span className="text-zinc-400">Track A (Out):</span>
            <span className="text-cyan-400 font-bold truncate max-w-[280px]">
              {fromTrack.artist} - {fromTrack.title} ({fromTrack.camelot})
            </span>
          </div>

          <div className="bg-[#090a0f] p-3 rounded-xl border border-[#1b2033] flex items-center justify-between">
            <span className="text-zinc-400">Track B (In):</span>
            <span className="text-emerald-400 font-bold truncate max-w-[280px]">
              {toTrack.artist} - {toTrack.title} ({toTrack.camelot})
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Preferred Transition Technique
          </label>
          <select
            value={transitionType}
            onChange={(e) => setTransitionType(e.target.value as TransitionType)}
            className="w-full bg-[#0d0f17] border border-[#2d3752] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="drop_mix">⚡ Drop Mix on Beat 1 (Bass Swap)</option>
            <option value="long_blend">Long Phrased Blend (32–64 beats)</option>
            <option value="cold_cut">Cold Drop / Hard Cut</option>
            <option value="echo_out">Echo-Out / Delay Tail</option>
            <option value="filter_sweep">Filter Sweep (HPF/LPF)</option>
            <option value="reverb_wash">Reverb Washout</option>
            <option value="breakdown_blend">Breakdown to Intro Blend</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            DJ Cue & Atmospheric Notes
          </label>
          <input
            type="text"
            value={cueNote}
            onChange={(e) => setCueNote(e.target.value)}
            placeholder="e.g. Mix on Outro 03:15, explosive energy spike into drop"
            className="w-full bg-[#0d0f17] border border-[#2d3752] rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Affinity / Star Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                onClick={() => setAffinityScore(stars)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  affinityScore >= stars
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#0d0f17] border-[#22293d] text-zinc-500'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                {stars}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg glow-magenta cursor-pointer"
        >
          Remember This Transition in Memory
        </button>
      </div>
    </div>
  );
}
