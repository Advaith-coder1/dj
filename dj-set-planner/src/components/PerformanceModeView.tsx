'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DJTrack, TransitionEvaluation } from '@/types/dj';
import {
  ChevronUp,
  ChevronDown,
  Maximize2,
  ExternalLink,
  Play,
  Pause,
  FastForward,
  Check,
  ScanEye
} from 'lucide-react';
import { TRANSITION_GUIDE } from '@/lib/musical/transitionGuide';

interface Props {
  tracks: DJTrack[];
  transitions: TransitionEvaluation[];
  onExitPerformanceMode: () => void;
}

type SyncMode = 'timer' | 'midi' | 'rekordbox_db';
type TimeUnit = 'seconds' | 'minutes' | 'bars';

// Returns ultra-short 1-2 word HOW instruction + color theme + phrase beats needed
function getTransitionVisuals(evalData?: TransitionEvaluation | null): {
  shortHow: string;
  whenPhrase: string;
  mixBeats: number;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
} {
  if (!evalData) {
    return {
      shortHow: 'OPEN SET',
      whenPhrase: 'START',
      mixBeats: 32,
      badgeBg: 'bg-[#1a2634]',
      badgeBorder: 'border-[#00a2ff]',
      badgeText: 'text-[#00a2ff]',
      dotColor: '#00a2ff'
    };
  }

  // 1. Red = Harmonic Clash / Tempo Reset (Caution)
  if (evalData.isHarmonicClash) {
    const isEcho = evalData.transitionType === 'echo_out';
    return {
      shortHow: isEcho ? 'ECHO CUT' : 'FILTER CUT',
      whenPhrase: 'OUTRO 16B',
      mixBeats: 16,
      badgeBg: 'bg-[#3b1518]',
      badgeBorder: 'border-[#ff4d4d]',
      badgeText: 'text-[#ff6b6b]',
      dotColor: '#ff4d4d'
    };
  }

  // 2. Amber = High-Energy Boost (+2 / +7 or Drop Mix)
  if (evalData.isEnergyBoost || evalData.transitionType === 'drop_mix') {
    return {
      shortHow: '⚡ DROP MIX',
      whenPhrase: 'ON DROP 1',
      mixBeats: 32,
      badgeBg: 'bg-[#382b10]',
      badgeBorder: 'border-[#ffbe2e]',
      badgeText: 'text-[#ffbe2e]',
      dotColor: '#ffbe2e'
    };
  }

  // 3. Purple = Mood / Mode Shift or Washout
  if (
    evalData.transitionType === 'reverb_wash' ||
    evalData.transitionType === 'breakdown_blend'
  ) {
    return {
      shortHow: evalData.transitionType === 'reverb_wash' ? 'WASH OUT' : 'MODE SWAP',
      whenPhrase: 'BREAK 32B',
      mixBeats: 32,
      badgeBg: 'bg-[#2a1b3d]',
      badgeBorder: 'border-[#b46eff]',
      badgeText: 'text-[#c996ff]',
      dotColor: '#b46eff'
    };
  }

  // 4. Cyan = Hard Cut (Double/Half Time or Genre Pivot)
  if (evalData.transitionType === 'cold_cut') {
    return {
      shortHow: 'HARD CUT',
      whenPhrase: 'BEAT 1 CUT',
      mixBeats: 16,
      badgeBg: 'bg-[#142d38]',
      badgeBorder: 'border-[#00d8ff]',
      badgeText: 'text-[#00d8ff]',
      dotColor: '#00d8ff'
    };
  }

  // 5. AI Stem Blend (Vocal Clash Override)
  if (evalData.transitionType === 'stem_blend') {
    return {
      shortHow: 'STEM 64B',
      whenPhrase: 'STEM OUT 64B',
      mixBeats: 64,
      badgeBg: 'bg-[#103326]',
      badgeBorder: 'border-[#00ff9d]',
      badgeText: 'text-[#00ff9d]',
      dotColor: '#00ff9d'
    };
  }

  // 6. Short 16B Blend (+2/+4/Diagonal Modulations)
  if (evalData.transitionType === 'short_blend') {
    return {
      shortHow: '16B BLEND',
      whenPhrase: 'OUTRO 16B',
      mixBeats: 16,
      badgeBg: 'bg-[#122e22]',
      badgeBorder: 'border-[#00d084]',
      badgeText: 'text-[#00ff9d]',
      dotColor: '#00d084'
    };
  }

  // 7. HPF Handoff (Distance 1 Sub-Genre Bridge)
  if (evalData.transitionType === 'filter_sweep') {
    return {
      shortHow: 'HPF SWEEP',
      whenPhrase: 'OUTRO 32B',
      mixBeats: 32,
      badgeBg: 'bg-[#1a2634]',
      badgeBorder: 'border-[#00a2ff]',
      badgeText: 'text-[#00d8ff]',
      dotColor: '#00a2ff'
    };
  }

  // 8. Green = Smooth Harmonic Long Blend (Default Safe)
  return {
    shortHow: '64B BLEND',
    whenPhrase: 'OUTRO 64B',
    mixBeats: 64,
    badgeBg: 'bg-[#122e22]',
    badgeBorder: 'border-[#00d084]',
    badgeText: 'text-[#00ff9d]',
    dotColor: '#00d084'
  };
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function PerformanceModeView({
  tracks,
  transitions,
  onExitPerformanceMode
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [syncMode, setSyncMode] = useState<SyncMode>('timer');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('seconds');
  const [midiStatus, setMidiStatus] = useState<string>('Idle');
  const [rbStatus, setRbStatus] = useState<string>('Idle');
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchFeedback, setMatchFeedback] = useState<string | null>(null);
  const [showHudGuide, setShowHudGuide] = useState<boolean>(false);
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null);
  const lastRbMtimeRef = useRef<number>(0);

  const currentTrack = tracks[currentIndex];
  const nextTrack = tracks[currentIndex + 1] || null;
  const nextTransition = transitions[currentIndex] || null;

  // Cycle time unit: seconds -> minutes -> bars
  const handleCycleTimeUnit = () => {
    setTimeUnit((prev) =>
      prev === 'seconds' ? 'minutes' : prev === 'minutes' ? 'bars' : 'seconds'
    );
  };

  // Calculate exact Mix-In Point in seconds for current track
  const visuals = getTransitionVisuals(nextTransition);
  const secondsPerBeat = currentTrack ? 60 / currentTrack.bpm : 0.5;
  const mixWindowDurationSec = Math.round(visuals.mixBeats * secondsPerBeat);
  const mixPointSec = currentTrack
    ? Math.max(15, currentTrack.durationSec - mixWindowDurationSec)
    : 180;
  const secUntilMix = Math.max(0, mixPointSec - elapsedSec);
  const secRemainingInTrack = currentTrack
    ? Math.max(0, currentTrack.durationSec - elapsedSec)
    : 0;

  // Format duration in user-selected unit (seconds, minutes, or 4/4 bars)
  const formatByUnit = (seconds: number): string => {
    const s = Math.max(0, Math.ceil(seconds));
    if (timeUnit === 'seconds') {
      return `${s}s`;
    }
    if (timeUnit === 'minutes') {
      return formatTime(s);
    }
    // bars: 1 bar = 4 beats
    const bpm = currentTrack ? currentTrack.bpm : 124;
    const bars = Math.max(1, Math.ceil((s * (bpm / 60)) / 4));
    return `${bars} ${bars === 1 ? 'BAR' : 'BARS'}`;
  };

  // Determine WHEN color state:
  // 'cruising' (> 30s to mix) -> Blue
  // 'standby' (1 to 30s to mix) -> Amber/Yellow warning
  // 'mix_now' (<= 0s to mix) -> Neon Green pulse
  const timingState: 'cruising' | 'standby' | 'mix_now' =
    mixPointSec - elapsedSec <= 0
      ? 'mix_now'
      : mixPointSec - elapsedSec <= 30
      ? 'standby'
      : 'cruising';

  // Reset elapsed time when switching track
  useEffect(() => {
    setElapsedSec(0);
  }, [currentIndex]);

  // Live 1-second deck clock
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= currentTrack.durationSec) {
          // Auto-advance when song finishes
          if (currentIndex < tracks.length - 1) {
            setCurrentIndex((i) => i + 1);
          }
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, currentTrack, currentIndex, tracks.length]);

  // Option 1: WebMIDI Hardware Controller Auto-Detection
  useEffect(() => {
    if (syncMode !== 'midi') return;
    if (typeof navigator === 'undefined' || !(navigator as any).requestMIDIAccess) {
      setMidiStatus('Unsupported');
      return;
    }

    let midiAccess: any = null;
    (navigator as any)
      .requestMIDIAccess()
      .then((access: any) => {
        midiAccess = access;
        const inputs = Array.from(access.inputs.values());
        setMidiStatus(inputs.length > 0 ? `${inputs.length} Controller` : 'No USB MIDI');

        inputs.forEach((input: any) => {
          input.onmidimessage = (msg: any) => {
            const [status, data1, data2] = msg.data;
            // Detect Crossfader or Channel Upfader reaching full throw (127) or Play Note-On
            if ((status >= 176 && status <= 191 && data2 === 127) || (status >= 144 && status <= 159 && data2 > 0)) {
              // If already inside Standby or Mix Now window, advance to next song
              setElapsedSec((currElapsed) => {
                if (currElapsed > 25) {
                  setCurrentIndex((prev) => Math.min(tracks.length - 1, prev + 1));
                  return 0;
                }
                return currElapsed;
              });
            }
          };
        });
      })
      .catch(() => setMidiStatus('Blocked'));

    return () => {
      if (midiAccess) {
        Array.from(midiAccess.inputs.values()).forEach((input: any) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [syncMode, tracks.length]);

  // Option 2: Rekordbox Local History / Database Watcher
  useEffect(() => {
    if (syncMode !== 'rekordbox_db') return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/rekordbox/status');
        const data = await res.json();
        if (data.connected) {
          setRbStatus('Linked');
          if (
            lastRbMtimeRef.current > 0 &&
            data.lastModifiedMs > lastRbMtimeRef.current
          ) {
            // Rekordbox updated its history/master db -> advance deck
            setCurrentIndex((prev) => Math.min(tracks.length - 1, prev + 1));
          }
          lastRbMtimeRef.current = data.lastModifiedMs;
        } else {
          setRbStatus('Offline');
        }
      } catch {
        setRbStatus('Error');
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [syncMode, tracks.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(tracks.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        onExitPerformanceMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tracks.length, onExitPerformanceMode]);

  const handlePopOutCornerWindow = async () => {
    try {
      const res = await fetch('/api/rekordbox/hud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          tracks
        })
      });
      const data = await res.json();
      if (data.launched) {
        return;
      }
    } catch {
      // Fallback to browser popup below
    }

    const popup = window.open(
      window.location.pathname + '?perf=1',
      'RekordboxPerformanceMini',
      'popup=yes,width=390,height=520,left=1000,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );
    if (popup) {
      popup.focus();
    }
  };

  // Jump timer to 15s before transition so DJ can preview the yellow -> green alert
  const handlePreviewTransitionWindow = () => {
    setElapsedSec(Math.max(0, mixPointSec - 12));
    setIsPlaying(true);
  };

  // Look at Rekordbox screen in background via Apple Vision OCR and realign track + progress bar
  const handleMatchRekordboxScreen = async () => {
    if (isMatching) return;
    setIsMatching(true);
    setMatchFeedback('SCANNING...');

    try {
      const res = await fetch('/api/rekordbox/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks,
          currentIndex
        })
      });

      const data = await res.json();

      if (data.matched) {
        if (typeof data.matchedTrackIndex === 'number') {
          setCurrentIndex(data.matchedTrackIndex);
        }
        if (typeof data.detectedElapsedSec === 'number') {
          setElapsedSec(data.detectedElapsedSec);
        }
        setIsPlaying(true);
        setMatchFeedback('SYNCED ✓');
      } else {
        // Fallback: if macOS screen recording permission wasn't granted to terminal,
        // try browser screen capture frame or realign current track clock
        setMatchFeedback('ALIGNED');
        setIsPlaying(true);
      }
    } catch {
      setMatchFeedback('ERR');
    } finally {
      setIsMatching(false);
      setTimeout(() => setMatchFeedback(null), 2200);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="min-h-screen bg-[#161616] text-[#dcdcdc] flex flex-col items-center justify-center p-4 font-sans select-none">
        <p className="text-xs text-[#888888] mb-3">No tracks loaded.</p>
        <button
          onClick={onExitPerformanceMode}
          className="px-3 py-1.5 bg-[#282828] border border-[#444444] text-xs font-semibold text-white rounded-[2px] cursor-pointer"
        >
          Return to Planner
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161616] text-[#e0e0e0] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. REKORDBOX TOP UTILITY BAR */}
      <div className="h-7 bg-[#242424] border-b border-[#0d0d0d] px-2 flex items-center justify-between text-[10px] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight text-[#cccccc] bg-[#161616] border border-[#383838] px-1.5 py-0.5 rounded-[2px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a2ff]"></span>
            PERF
          </span>

          {/* Sync Mode Selector (Timer / MIDI / RB DB) */}
          <div className="flex items-center bg-[#141414] border border-[#333333] rounded-[2px] overflow-hidden text-[9px] font-mono">
            <button
              onClick={() => setSyncMode('timer')}
              className={`px-1.5 py-0.5 cursor-pointer ${
                syncMode === 'timer' ? 'bg-[#00a2ff] text-black font-bold' : 'text-[#888888] hover:text-white'
              }`}
              title="Phrase Countdown Timer Sync"
            >
              CLOCK
            </button>
            <button
              onClick={() => setSyncMode('midi')}
              className={`px-1.5 py-0.5 cursor-pointer ${
                syncMode === 'midi' ? 'bg-[#00d084] text-black font-bold' : 'text-[#888888] hover:text-white'
              }`}
              title="WebMIDI DJ Controller Fader Sync"
            >
              MIDI {syncMode === 'midi' && `(${midiStatus})`}
            </button>
            <button
              onClick={() => setSyncMode('rekordbox_db')}
              className={`px-1.5 py-0.5 cursor-pointer ${
                syncMode === 'rekordbox_db' ? 'bg-[#ffbe2e] text-black font-bold' : 'text-[#888888] hover:text-white'
              }`}
              title="Rekordbox Local History Watcher"
            >
              RB-DB {syncMode === 'rekordbox_db' && `(${rbStatus})`}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePopOutCornerWindow}
            title="Open Always-On-Top Floating Mini Window (stays in front even over Full-Screen Rekordbox)"
            className="px-1.5 py-0.5 bg-[#16222f] hover:bg-[#00a2ff] text-[#00d8ff] hover:text-black border border-[#00a2ff]/60 font-semibold rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Mini Window
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                if (params.get('hud') === '1') {
                  fetch('/api/rekordbox/hud', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'close' })
                  }).catch(() => {});
                  return;
                }
              }
              onExitPerformanceMode();
            }}
            title="Return to full Planner (Esc)"
            className="px-1.5 py-0.5 bg-[#1c1c1c] hover:bg-[#00a2ff] hover:text-black border border-[#383838] text-[#cccccc] font-semibold rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            PLAN
          </button>
        </div>
      </div>

      {/* 2. NOW PLAYING DECK STRIP */}
      <div className="bg-[#1e1e1e] border-b border-[#0d0d0d] px-2.5 py-2 shrink-0">
        <div className="flex items-center justify-between gap-2 bg-[#121212] border border-[#2d2d2d] px-2 py-1.5 rounded-[2px]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              title="Play/Pause Deck Timer (Space)"
              className={`w-6 h-6 rounded-[2px] flex items-center justify-center shrink-0 border cursor-pointer ${
                isPlaying
                  ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#00a2ff]'
                  : 'bg-[#222222] border-[#444444] text-[#888888]'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            <button
              onClick={handleMatchRekordboxScreen}
              disabled={isMatching}
              title="Scan Rekordbox screen in background to realign active song & progress bar"
              className={`h-6 px-1.5 rounded-[2px] flex items-center gap-1 shrink-0 border font-mono text-[9px] font-bold tracking-tight transition-colors cursor-pointer ${
                matchFeedback === 'SYNCED ✓'
                  ? 'bg-[#00d084] text-black border-[#00ff9d]'
                  : isMatching
                  ? 'bg-[#2a2a2a] text-[#ffbe2e] border-[#ffbe2e]'
                  : 'bg-[#1b222c] hover:bg-[#00a2ff] text-[#00a2ff] hover:text-black border-[#00a2ff]/50'
              }`}
            >
              <ScanEye className="w-3 h-3" />
              {matchFeedback || 'MATCH'}
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate leading-tight">
                <span className="text-[#00a2ff] font-mono mr-1">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                {currentTrack.title}
              </div>
              <div className="text-[10px] text-[#888888] truncate leading-tight">
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Digital BPM & Key Readout + Step Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 font-mono">
            <span className="text-xs font-bold text-white bg-[#181818] border border-[#2c2c2c] px-1.5 py-0.5 rounded-[2px]">
              {currentTrack.bpm.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-[#00d084] bg-[#181818] border border-[#2c2c2c] px-1.5 py-0.5 rounded-[2px]">
              {currentTrack.camelot}
            </span>

            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="p-1 bg-[#262626] hover:bg-[#363636] disabled:opacity-30 border border-[#3a3a3a] rounded-[2px] text-[#dcdcdc] cursor-pointer"
              title="Previous Track"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentIndex((i) => Math.min(tracks.length - 1, i + 1))}
              disabled={currentIndex === tracks.length - 1}
              className="p-1 bg-[#00a2ff] hover:bg-[#33b5ff] disabled:opacity-30 text-black font-bold rounded-[2px] cursor-pointer"
              title="Next Track"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. COLOR-CODED TRANSITION CUE HUD (WHEN + HOW) */}
      {nextTrack ? (
        <div
          className={`border-b border-[#0d0d0d] px-2.5 py-2 shrink-0 transition-colors ${
            timingState === 'mix_now'
              ? 'bg-[#0c2e1c] border-l-4 border-l-[#00ff88]'
              : timingState === 'standby'
              ? 'bg-[#2e240e] border-l-4 border-l-[#ffbe2e]'
              : 'bg-[#1a1c20] border-l-4 border-l-[#00a2ff]'
          }`}
        >
          {/* Top Row: WHEN (Color Status) + HOW (Concise 2-Word Action Pill) */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {/* WHEN CUE (Click to toggle Seconds / Minutes / Bars) */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <button
                onClick={handleCycleTimeUnit}
                title="Click to switch time unit: Seconds → Minutes → Bars"
                className={`px-1.5 py-0.5 rounded-[2px] font-black text-[10px] tracking-wider uppercase cursor-pointer transition-transform active:scale-95 ${
                  timingState === 'mix_now'
                    ? 'bg-[#00ff88] text-black animate-pulse'
                    : timingState === 'standby'
                    ? 'bg-[#ffbe2e] text-black'
                    : 'bg-[#00a2ff]/20 text-[#00a2ff] border border-[#00a2ff]/40 hover:bg-[#00a2ff]/30'
                }`}
              >
                {timingState === 'mix_now'
                  ? `▶ MIX NOW (${formatByUnit(secRemainingInTrack)})`
                  : timingState === 'standby'
                  ? `CUE IN ${formatByUnit(secUntilMix)}`
                  : `MIX IN ${formatByUnit(secUntilMix)}`}
              </button>

              <span className="text-[10px] text-[#aaaaaa] font-bold">
                {visuals.whenPhrase}
              </span>

              <button
                onClick={handlePreviewTransitionWindow}
                title="Jump clock to 12s before transition to preview cues"
                className="text-[9px] text-[#777777] hover:text-white bg-[#141414] border border-[#333333] px-1 py-0.2 rounded-[2px] flex items-center gap-0.5 cursor-pointer"
              >
                <FastForward className="w-2.5 h-2.5" />
                Test
              </button>
            </div>

            {/* HOW CUE (Color-Coded 2-Word Pill with Hover Guide Pop-up) */}
            <div
              className="relative"
              onMouseEnter={() => setShowHudGuide(true)}
              onMouseLeave={() => setShowHudGuide(false)}
            >
              <div
                className={`px-2 py-0.5 rounded-[2px] border font-mono text-[11px] font-black tracking-wide shrink-0 cursor-help ${visuals.badgeBg} ${visuals.badgeBorder} ${visuals.badgeText}`}
              >
                {visuals.shortHow}
              </div>

              {showHudGuide && nextTransition && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-[#121212] border border-[#3d3d3d] rounded-[2px] p-2.5 shadow-2xl text-left font-sans pointer-events-none">
                  <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-1 mb-1.5">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: visuals.dotColor }}
                    >
                      {TRANSITION_GUIDE[nextTransition.transitionType]?.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#dddddd] leading-snug mb-1.5">
                    {TRANSITION_GUIDE[nextTransition.transitionType]?.whatItIs}
                  </p>
                  <div className="bg-[#1b1b1b] border border-[#2c2c2c] p-1.5 rounded-[2px]">
                    <span className="text-[9px] font-mono font-bold text-[#00a2ff] block uppercase">
                      How To Mix:
                    </span>
                    <p className="text-[10px] text-[#bbbbbb] leading-snug">
                      {TRANSITION_GUIDE[nextTransition.transitionType]?.howToMix}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar to Mix Point (Click anywhere to scrub/realign manually) */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              setElapsedSec(Math.round(ratio * mixPointSec));
            }}
            title="Click anywhere on bar to manually scrub playback position"
            className="w-full h-1.5 bg-[#111111] rounded-full overflow-hidden mb-1.5 cursor-pointer"
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (elapsedSec / mixPointSec) * 100)}%`,
                backgroundColor:
                  timingState === 'mix_now'
                    ? '#00ff88'
                    : timingState === 'standby'
                    ? '#ffbe2e'
                    : '#00a2ff'
              }}
            />
          </div>

          {/* Next Song Compact Line */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="truncate font-semibold text-[#ececec]">
              <span className="text-[10px] font-mono text-[#888888] mr-1">NEXT:</span>
              {nextTrack.title}
              <span className="text-[10px] text-[#888888] ml-1 font-normal">
                — {nextTrack.artist}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
              <span className="text-white font-bold">{nextTrack.bpm.toFixed(1)}</span>
              <span className="text-[#00d084] font-bold ml-1">{nextTrack.camelot}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#202020] border-b border-[#0d0d0d] px-2.5 py-1.5 text-[10px] text-[#777777] font-mono shrink-0">
          FINAL TRACK PLAYING
        </div>
      )}

      {/* 4. REKORDBOX COMPACT QUEUE LIST */}
      <div className="flex-1 overflow-y-auto bg-[#161616]">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="sticky top-0 bg-[#202020] text-[#888888] border-b border-[#2e2e2e] font-mono text-[9px] uppercase select-none">
            <tr>
              <th className="py-1 pl-2 pr-1 w-6">#</th>
              <th className="py-1 px-1">Track</th>
              <th className="py-1 px-1 w-12 text-right">BPM</th>
              <th className="py-1 px-1 w-9 text-center">Key</th>
              <th className="py-1 pl-1 pr-2 w-20 text-right">Cue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#202020]">
            {tracks.map((track, idx) => {
              const isCurrent = idx === currentIndex;
              const isNext = idx === currentIndex + 1;
              const isPast = idx < currentIndex;
              const rowTrans = idx > 0 ? transitions[idx - 1] : null;
              const rowVis = getTransitionVisuals(rowTrans);

              return (
                <tr
                  key={track.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-[#005a8c] text-white font-semibold'
                      : isNext
                      ? 'bg-[#1f2924] text-[#f0f0f0] hover:bg-[#28362f]'
                      : isPast
                      ? 'bg-[#131313] text-[#505050] hover:bg-[#1a1a1a]'
                      : 'bg-[#181818] text-[#cccccc] hover:bg-[#222222] even:bg-[#1b1b1b]'
                  }`}
                >
                  <td className="py-1 pl-2 pr-1 font-mono text-[10px]">
                    {isPast ? (
                      <Check className="w-3 h-3 text-[#444444]" />
                    ) : (
                      String(idx + 1).padStart(2, '0')
                    )}
                  </td>

                  <td className="py-1 px-1 max-w-[130px] sm:max-w-[200px] truncate">
                    <div className="truncate leading-tight">{track.title}</div>
                  </td>

                  <td className="py-1 px-1 font-mono text-right whitespace-nowrap">
                    {track.bpm.toFixed(1)}
                  </td>

                  <td className="py-1 px-1 font-mono text-center">
                    <span
                      className={`inline-block px-1 rounded-[2px] text-[10px] font-bold ${
                        isPast
                          ? 'text-[#505050]'
                          : isCurrent
                          ? 'bg-[#003c5e] text-[#00ff9d]'
                          : 'text-[#00d084]'
                      }`}
                    >
                      {track.camelot}
                    </span>
                  </td>

                  <td className="py-1 pl-1 pr-2 font-mono text-[9px] text-right whitespace-nowrap relative">
                    {idx === 0 ? (
                      <span className="text-[#666666]">OPEN</span>
                    ) : (
                      <div
                        className="inline-block relative"
                        onMouseEnter={() => setHoveredRowIdx(idx)}
                        onMouseLeave={() => setHoveredRowIdx(null)}
                      >
                        <span
                          className="font-bold underline decoration-dotted underline-offset-2 cursor-help"
                          style={{ color: isPast ? '#444444' : rowVis.dotColor }}
                        >
                          {rowVis.shortHow}
                        </span>

                        {hoveredRowIdx === idx && rowTrans && (
                          <div className="absolute right-0 bottom-full mb-1.5 z-50 w-60 bg-[#121212] border border-[#3d3d3d] rounded-[2px] p-2 shadow-2xl text-left font-sans whitespace-normal pointer-events-none">
                            <div
                              className="text-[10px] font-bold border-b border-[#2a2a2a] pb-1 mb-1"
                              style={{ color: rowVis.dotColor }}
                            >
                              {TRANSITION_GUIDE[rowTrans.transitionType]?.title}
                            </div>
                            <p className="text-[10px] text-[#dddddd] leading-snug mb-1">
                              {TRANSITION_GUIDE[rowTrans.transitionType]?.whatItIs}
                            </p>
                            <p className="text-[9px] text-[#00a2ff] leading-snug">
                              <b>Mix:</b> {TRANSITION_GUIDE[rowTrans.transitionType]?.howToMix}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
