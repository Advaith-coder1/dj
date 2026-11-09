'use client';

import React, { useState } from 'react';
import { EnergyCurveType } from '@/types/dj';
import { TrendingUp, Waves, Minus, Flame, PartyPopper, Compass, TrendingDown, Clock, BrainCircuit } from 'lucide-react';
import { getTargetEnergy } from '@/lib/sequencing/tspOptimizer';

interface Props {
  durationMinutes: number;
  setDurationMinutes: (val: number) => void;
  curveType: EnergyCurveType;
  setCurveType: (val: EnergyCurveType) => void;
  prioritizeSavedMemory: boolean;
  setPrioritizeSavedMemory: (val: boolean) => void;
  onRunOptimization: () => void;
  totalLibraryCount: number;
}

interface CurveOption {
  id: EnergyCurveType;
  label: string;
  desc: string;
  rangeBadge: string;
  atmosphereTip: string;
  color: string;
  icon: any;
}

function MiniCurveGraph({ curveId, strokeColor }: { curveId: EnergyCurveType; strokeColor: string }) {
  const width = 180;
  const height = 64;
  const padX = 8;
  const padY = 8;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const steps = 28;
  const points: { x: number; y: number; e: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const energy = getTargetEnergy(curveId, t); // 0.0 - 1.0
    const x = padX + t * plotW;
    // Map energy [0.25, 1.0] into plot height
    const normalizedY = Math.min(1, Math.max(0, (energy - 0.25) / 0.75));
    const y = padY + plotH - normalizedY * plotH;
    points.push({ x, y, e: energy });
  }

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints = `${padX},${padY + plotH} ${polylinePoints} ${padX + plotW},${padY + plotH}`;
  const gradId = `curve-grad-${curveId}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Subtle horizontal reference grid lines */}
      <line x1={padX} y1={padY} x2={padX + plotW} y2={padY} stroke="#1e263b" strokeDasharray="2 2" strokeWidth="1" />
      <line x1={padX} y1={padY + plotH / 2} x2={padX + plotW} y2={padY + plotH / 2} stroke="#1e263b" strokeDasharray="2 2" strokeWidth="1" />
      <line x1={padX} y1={padY + plotH} x2={padX + plotW} y2={padY + plotH} stroke="#2a3450" strokeWidth="1" />

      {/* For PARTIES curve, show subtle 1/3 vertical marker where Ramp transitions into upward Wave */}
      {curveId === 'parties' && (
        <line
          x1={padX + plotW / 3}
          y1={padY}
          x2={padX + plotW / 3}
          y2={padY + plotH}
          stroke={strokeColor}
          strokeOpacity="0.4"
          strokeDasharray="2 2"
          strokeWidth="1"
        />
      )}

      {/* Shaded Area under curve */}
      <polygon points={areaPoints} fill={`url(#${gradId})`} />

      {/* Main Energy Trajectory Line */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />

      {/* Start and End Endpoint Dots */}
      <circle cx={points[0].x} cy={points[0].y} r="3" fill={strokeColor} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="#ffffff" stroke={strokeColor} strokeWidth="2" />
    </svg>
  );
}

export default function SetControls({
  durationMinutes,
  setDurationMinutes,
  curveType,
  setCurveType,
  prioritizeSavedMemory,
  setPrioritizeSavedMemory,
  onRunOptimization,
  totalLibraryCount
}: Props) {
  const [hoveredCurve, setHoveredCurve] = useState<EnergyCurveType | null>(null);

  const curves: CurveOption[] = [
    {
      id: 'ramp',
      label: 'The Ramp',
      desc: 'Gradual build up to peak time',
      rangeBadge: '40% → 95% Energy',
      atmosphereTip: 'Steady climb from warm-up groove to peak-hour climax',
      color: '#06b6d4', // cyan
      icon: TrendingUp
    },
    {
      id: 'wave',
      label: 'The Wave',
      desc: 'Alternating peaks & low breathers',
      rangeBadge: '50% ↔ 90% Wave',
      atmosphereTip: 'Rollercoaster tension & release to prevent crowd fatigue',
      color: '#d946ef', // fuchsia
      icon: Waves
    },
    {
      id: 'flatline',
      label: 'Lounge / Warm-Up',
      desc: 'Steady hypnotic groove',
      rangeBadge: '~55% Constant',
      atmosphereTip: 'Consistent, locked-in atmosphere for openers or deep sets',
      color: '#10b981', // emerald
      icon: Minus
    },
    {
      id: 'festival',
      label: 'Festival Smasher',
      desc: 'High adrenaline throughout',
      rangeBadge: '85% → 95% Peak',
      atmosphereTip: 'Immediate high-impact mainstage energy from start to finish',
      color: '#f59e0b', // amber
      icon: Flame
    },
    {
      id: 'parties',
      label: 'PARTIES',
      desc: '1/3 Ramp + Upward Wave',
      rangeBadge: 'Ramp → Rising Wave',
      atmosphereTip: 'First 1/3 builds steadily like a Ramp; final 2/3 trends upward with peaks & breathers',
      color: '#f43f5e', // neon rose
      icon: PartyPopper
    },
    {
      id: 'journey',
      label: 'The Journey',
      desc: 'Bell Curve emotional arc',
      rangeBadge: '38% → 95% → 44%',
      atmosphereTip: 'Starts low, peaks in the middle third, and gently winds down — optimal for headline sets',
      color: '#8b5cf6', // violet
      icon: Compass
    },
    {
      id: 'cooldown',
      label: 'The Cool-Down',
      desc: 'Gradual closing descent',
      rangeBadge: '92% → 40% Ambient',
      atmosphereTip: 'Smooth deceleration from peak intensity down to deep afterhours mood',
      color: '#38bdf8', // sky blue
      icon: TrendingDown
    },
  ];

  return (
    <div className="bg-[#121520] border border-[#22293d] rounded-2xl p-6 shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Duration Slider */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              Target Set Duration
            </span>
            <span className="text-cyan-400 font-mono text-sm">{durationMinutes} min</span>
          </div>
          <input
            type="range"
            min={15}
            max={180}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[#1b2033] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>30m</span>
            <span>60m (Standard)</span>
            <span>90m</span>
            <span>120m+</span>
          </div>
        </div>

        {/* Energy Curve Preset Selection */}
        <div className="lg:col-span-5">
          <label className="block text-xs font-semibold text-zinc-400 mb-2">
            Dynamic Energy Curve <span className="text-[10px] text-zinc-500 font-normal ml-1">(Hover to preview curve)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {curves.map((c) => {
              const Icon = c.icon;
              const isSelected = curveType === c.id;
              const isHovered = hoveredCurve === c.id;

              return (
                <div
                  key={c.id}
                  className="relative"
                  onMouseEnter={() => setHoveredCurve(c.id)}
                  onMouseLeave={() => setHoveredCurve(null)}
                >
                  {/* Hover Pop-up Graph */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 w-56 bg-[#090b12]/95 border border-[#2d3752] rounded-xl p-3 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-white">{c.label}</span>
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#161a29] border border-[#252d44]"
                          style={{ color: c.color }}
                        >
                          {c.rangeBadge}
                        </span>
                      </div>

                      {/* Simplified SVG Curve Preview */}
                      <div className="bg-[#0d101a] border border-[#1b2135] rounded-lg p-1.5 flex flex-col items-center">
                        <MiniCurveGraph curveId={c.id} strokeColor={c.color} />
                        <div className="w-full flex justify-between text-[8px] font-mono text-zinc-500 px-1 mt-0.5">
                          <span>0m (Start)</span>
                          <span>Time →</span>
                          <span>{durationMinutes}m (End)</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-400 mt-2 leading-snug">
                        {c.atmosphereTip}
                      </p>

                      {/* Bottom Arrow Caret */}
                      <div className="w-2.5 h-2.5 bg-[#090b12] border-r border-b border-[#2d3752] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                    </div>
                  )}

                  <button
                    onClick={() => setCurveType(c.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm glow-cyan'
                        : 'bg-[#0d0f17] border-[#22293d] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">{c.label}</p>
                      <p className="text-[10px] text-zinc-500 truncate max-w-[110px]">{c.desc}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Memory Toggle & Trigger Button */}
        <div className="lg:col-span-3 flex flex-col gap-3 justify-center">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={prioritizeSavedMemory}
              onChange={(e) => setPrioritizeSavedMemory(e.target.checked)}
              className="w-4 h-4 rounded bg-[#1b2033] border-zinc-700 text-cyan-500 focus:ring-0 accent-cyan-400"
            />
            <span className="flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5 text-fuchsia-400" />
              Prioritize Saved Transitions
            </span>
          </label>

          <button
            onClick={onRunOptimization}
            disabled={totalLibraryCount === 0}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg glow-cyan disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Compute Optimal Set Sequence
          </button>
        </div>
      </div>
    </div>
  );
}
