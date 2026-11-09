'use client';

import React, { useState } from 'react';
import { DJTrack, TransitionEvaluation, SavedTransition } from '@/types/dj';
import { GripVertical, AlertTriangle, Zap, BookmarkPlus, ArrowDown, Info } from 'lucide-react';
import { TRANSITION_GUIDE } from '@/lib/musical/transitionGuide';

interface Props {
  tracks: DJTrack[];
  transitions: TransitionEvaluation[];
  onReorder: (newTracks: DJTrack[]) => void;
  onOpenSaveModal: (fromTrack: DJTrack, toTrack: DJTrack, evalData: TransitionEvaluation) => void;
  onMoveToReserve: (trackId: string) => void;
}

export default function TrackSequenceTable({
  tracks,
  transitions,
  onReorder,
  onOpenSaveModal,
  onMoveToReserve
}: Props) {
  // Simple drag-and-drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [hoveredTransIdx, setHoveredTransIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const updated = [...tracks];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setDraggedIdx(targetIdx);
    onReorder(updated);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  return (
    <div className="bg-[#121520] border border-[#22293d] rounded-2xl p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#22293d]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Sequenced Playlist ({tracks.length} Tracks)
          </h3>
          <p className="text-xs text-zinc-500">
            Drag any track to manually re-order. Hover over any transition type to see how to mix it.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {tracks.map((track, idx) => {
          const trans = idx > 0 ? transitions[idx - 1] : null;
          const guide = trans ? TRANSITION_GUIDE[trans.transitionType] : null;

          return (
            <React.Fragment key={track.id}>
              {/* Transition Banner between tracks */}
              {trans && (
                <div className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-xs border font-mono transition-all ${
                  trans.isHarmonicClash
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    : trans.isEnergyBoost
                    ? 'bg-amber-950/20 border-amber-600/40 text-amber-300'
                    : 'bg-[#0d0f17] border-[#1e2436] text-zinc-400'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ArrowDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <div
                      className="relative shrink-0"
                      onMouseEnter={() => setHoveredTransIdx(idx)}
                      onMouseLeave={() => setHoveredTransIdx(null)}
                    >
                      <span className="font-bold flex items-center gap-1.5 underline decoration-dotted underline-offset-4 cursor-help hover:text-white transition-colors whitespace-nowrap">
                        {trans.isHarmonicClash && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        {trans.isEnergyBoost && <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {trans.transitionTypeName}
                        <Info className="w-3 h-3 opacity-60 shrink-0" />
                      </span>

                      {/* Transition Explanation Hover Pop-up Window */}
                      {hoveredTransIdx === idx && guide && (
                        <div className="absolute bottom-full left-0 mb-2.5 z-50 w-96 bg-[#090b12]/95 border border-[#2d3752] rounded-xl p-3.5 shadow-2xl backdrop-blur-md font-sans text-left pointer-events-none">
                          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-[#1f263b]">
                            <span className="text-xs font-bold text-white">
                              {guide.title}
                            </span>
                            <span
                              className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-[#141826] border border-[#2a334d]"
                              style={{ color: guide.accentColor }}
                            >
                              {guide.shortTag}
                            </span>
                          </div>

                          <div className="space-y-2 text-[11px] leading-snug">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                What It Is:
                              </span>
                              <p className="text-zinc-200">{guide.whatItIs}</p>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                                How To Execute:
                              </span>
                              <p className="text-zinc-300">{guide.howToMix}</p>
                            </div>

                            {trans.phraseAlignmentInstruction && (
                              <div className="bg-[#111624] border border-[#222c47] rounded-lg p-2">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                                  Phrase-Locked Grid Alignment (&lt;POSITION_MARK&gt;):
                                </span>
                                <p className="text-[10px] text-zinc-300 mt-0.5">
                                  {trans.phraseAlignmentInstruction}
                                </p>
                              </div>
                            )}

                            {trans.eqAutomationInstruction && (
                              <div className="bg-[#111624] border border-[#222c47] rounded-lg p-2">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                                  EQ Automation &amp; Crossfader ({trans.crossfaderCurve}):
                                </span>
                                <p className="text-[10px] text-zinc-300 mt-0.5">
                                  {trans.eqAutomationInstruction}
                                </p>
                              </div>
                            )}

                            {trans.stemDirective && (
                              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-2">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-300 block">
                                  AI Stem Separation Directive:
                                </span>
                                <p className="text-[10px] font-mono text-emerald-200 mt-0.5">
                                  {trans.stemDirective}
                                </p>
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 block">
                                Crowd &amp; Atmosphere:
                              </span>
                              <p className="text-zinc-400">{guide.atmosphereEffect}</p>
                            </div>

                            {trans.gainStagingNote && (
                              <div className="pt-1 border-t border-[#1f263b] text-[9px] font-mono text-zinc-500">
                                {trans.gainStagingNote}
                              </div>
                            )}
                          </div>

                          <div className="w-2.5 h-2.5 bg-[#090b12] border-r border-b border-[#2d3752] rotate-45 absolute -bottom-1.5 left-6"></div>
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-600 shrink-0">|</span>
                    <span className="text-[11px] text-zinc-400 min-w-0 truncate">
                      {trans.customDJNote || trans.atmosphericNote}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trans.genreScore >= 9
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : trans.genreScore >= 6
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      Genre: {trans.genreScore.toFixed(1)}/10
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trans.harmonicScore >= 9
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : trans.harmonicScore >= 7
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      Harmonic: {trans.harmonicScore.toFixed(1)}/10
                    </span>

                    <button
                      onClick={() => onOpenSaveModal(tracks[idx - 1], track, trans)}
                      title="Save this transition to Memory Knowledge Base"
                      className="flex items-center gap-1 px-2 py-1 bg-[#1b2033] hover:bg-[#252c47] text-zinc-300 hover:text-white rounded border border-[#2d3752] text-[10px] transition-all cursor-pointer"
                    >
                      <BookmarkPlus className="w-3 h-3 text-fuchsia-400" />
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Track Row */}
              <div
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 bg-[#0d0f17] hover:bg-[#151926] border border-[#1e2436] hover:border-cyan-500/40 p-3.5 rounded-xl transition-all cursor-move select-none"
              >
                <GripVertical className="w-4 h-4 text-zinc-600 hover:text-zinc-300 shrink-0" />

                <span className="font-mono text-zinc-500 font-bold text-xs w-5 text-center shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Full Song Name Prioritized (Never Truncated) */}
                  <p className="text-sm font-bold text-zinc-100 whitespace-normal break-words leading-snug">
                    {track.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400 mt-0.5">
                    <span className="font-medium text-zinc-300">{track.artist}</span>
                    {track.mix && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700 text-[10px] font-mono text-zinc-400">
                        {track.mix}
                      </span>
                    )}
                    {track.genre && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                        {track.genre}
                      </span>
                    )}
                    {track.label && (
                      <span className="hidden md:inline text-[10px] font-mono text-zinc-500">
                        • {track.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Right Badges: Camelot Key + BPM + Energy + Duration */}
                <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${
                    track.camelot.endsWith('A')
                      ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}>
                    {track.camelot}
                  </span>

                  {/* BPM Badge */}
                  <span className="px-2 py-0.5 rounded-md bg-[#161a29] border border-[#22293d] text-cyan-400 font-bold text-[11px]">
                    {track.bpm.toFixed(0)} BPM
                  </span>

                  {/* Energy Meter */}
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-[#161a29] border border-[#22293d] text-fuchsia-400 text-[11px]">
                    ⚡{Math.round(track.energy * 100)}%
                  </span>

                  {/* Duration */}
                  <span className="hidden md:inline-block text-zinc-500 text-[11px] w-10 text-right">
                    {Math.floor(track.durationSec / 60)}:{String(track.durationSec % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Move to Reserve button */}
                <button
                  onClick={() => onMoveToReserve(track.id)}
                  title="Move track to Reserve Pool"
                  className="px-2 py-1 text-[11px] text-zinc-500 hover:text-amber-400 hover:bg-amber-950/20 rounded transition-all cursor-pointer shrink-0"
                >
                  Reserve
                </button>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
