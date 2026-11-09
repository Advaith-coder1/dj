'use client';

import React from 'react';
import { DJTrack } from '@/types/dj';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface Props {
  tracks: DJTrack[];
}

export default function TrajectoryChart({ tracks }: Props) {
  if (tracks.length === 0) return null;

  const data = tracks.map((t, idx) => ({
    name: `#${idx + 1}`,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm,
    energy: Math.round(t.energy * 100),
    camelot: t.camelot
  }));

  return (
    <div className="bg-[#121520] border border-[#22293d] rounded-2xl p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Set Trajectory Visualizer
          </h3>
          <p className="text-xs text-zinc-500">
            Real-time BPM Progression (Cyan) & Macro Energy Curve (Fuchsia)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            BPM ({tracks[0]?.bpm.toFixed(0)} → {tracks[tracks.length - 1]?.bpm.toFixed(0)})
          </span>
          <span className="flex items-center gap-1.5 text-fuchsia-400">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400"></span>
            Energy (0-100%)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1b2033" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#4a5568" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="bpm" stroke="#06b6d4" domain={['dataMin - 4', 'dataMax + 4']} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="energy" stroke="#d946ef" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#090a0f] border border-[#2d3752] p-2.5 rounded-lg text-xs shadow-xl font-mono">
                      <p className="font-bold text-white mb-1">{d.name} {d.artist} - {d.title}</p>
                      <p className="text-cyan-400">Tempo: {d.bpm} BPM</p>
                      <p className="text-fuchsia-400">Energy: {d.energy}%</p>
                      <p className="text-amber-400">Camelot Key: {d.camelot}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line yAxisId="bpm" type="monotone" dataKey="bpm" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} />
            <Line yAxisId="energy" type="monotone" dataKey="energy" stroke="#d946ef" strokeWidth={2.5} dot={{ r: 3, fill: '#d946ef' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
