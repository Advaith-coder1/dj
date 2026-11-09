'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Music, Sparkles, FolderArchive } from 'lucide-react';
import { DJTrack } from '@/types/dj';
import { parseRekordboxXml } from '@/lib/parsers/rekordboxParser';
import { parseM3u } from '@/lib/parsers/m3uParser';

interface Props {
  onTracksLoaded: (tracks: DJTrack[], sourceName: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function IngestionDropzone({ onTracksLoaded, isLoading, setIsLoading }: Props) {
  const [activeTab, setActiveTab] = useState<'folder_xml' | 'folder_m3u' | 'song_list'>('folder_xml');
  const [textInput, setTextInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Rekordbox XML files
  const handleXmlFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    let allTracks: DJTrack[] = [];
    let fileCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.xml')) {
        fileCount++;
        const content = await file.text();
        const parsed = parseRekordboxXml(content);
        allTracks = [...allTracks, ...parsed];
      }
    }

    setIsLoading(false);
    if (allTracks.length > 0) {
      onTracksLoaded(allTracks, `${fileCount} XML File(s) (${allTracks.length} tracks)`);
    } else {
      alert('No valid Rekordbox <TRACK> entries found in the uploaded XML files.');
    }
  };

  // Parse M3U / M3U8 files
  const handleM3uFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    let allTracks: DJTrack[] = [];
    let fileCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.m3u') || file.name.toLowerCase().endsWith('.m3u8')) {
        fileCount++;
        const content = await file.text();
        const parsed = parseM3u(content);
        allTracks = [...allTracks, ...parsed];
      }
    }

    setIsLoading(false);
    if (allTracks.length > 0) {
      onTracksLoaded(allTracks, `${fileCount} M3U Playlist(s) (${allTracks.length} tracks)`);
    } else {
      alert('No valid tracks found in the uploaded M3U playlist files.');
    }
  };

  // Process plain text or CSV list via Spotify / Simulation API
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsLoading(true);

    const lines = textInput.split(/\r?\n/).filter(l => l.trim().length > 0);
    const items = lines.map(line => {
      if (line.includes(' - ')) {
        const parts = line.split(' - ');
        return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
      }
      return { artist: 'Unknown Artist', title: line.trim() };
    });

    try {
      const res = await fetch('/api/spotify/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.tracks && data.tracks.length > 0) {
        onTracksLoaded(data.tracks, `Song List (${data.tracks.length} tracks)`);
      } else {
        alert('Could not parse song list.');
      }
    } catch (err: any) {
      setIsLoading(false);
      alert('Error querying song features: ' + err.message);
    }
  };

  const loadSampleDemo = () => {
    // 10 curated festival / club tracks with full Rekordbox <POSITION_MARK> phrasing, Genre/Label, and Spotify acoustic features
    const sampleDemoTracks: DJTrack[] = [
      { id: 'demo_1', title: 'Innerbloom', artist: 'RÜFÜS DU SOL', bpm: 122, key: '8A', camelot: '8A', energy: 0.52, durationSec: 360, genre: 'Deep House', label: 'Sweat It Out', mix: 'Extended Mix', comments: 'Energy 5 - Warmup Hypnotic', introBeats: 64, outroBeats: 64, hasInstrumentalIntro: true, hasInstrumentalOutro: false, hasBreakdownCue: true, instrumentalness: 0.38, speechiness: 0.12, valence: 0.48, danceability: 0.78, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_2', title: 'Cola', artist: 'CamelPhat & Elderbrook', bpm: 122, key: '8A', camelot: '8A', energy: 0.68, durationSec: 223, genre: 'Deep House', label: 'Defected', mix: 'Club Mix', comments: 'Energy 7 - Vocal Groove', introBeats: 64, outroBeats: 32, hasInstrumentalIntro: false, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.25, speechiness: 0.36, valence: 0.62, danceability: 0.86, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_3', title: 'Breathe', artist: 'CamelPhat & Cristoph', bpm: 125, key: '9A', camelot: '9A', energy: 0.75, durationSec: 245, genre: 'Progressive House', label: 'Pryda', remixer: 'Eric Prydz Club Edit', mix: 'Extended Mix', comments: 'Energy 7 - Vocal Builder', introBeats: 64, outroBeats: 32, hasInstrumentalIntro: true, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.42, speechiness: 0.22, valence: 0.55, danceability: 0.82, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_4', title: 'Opus', artist: 'Eric Prydz', bpm: 126, key: '9A', camelot: '9A', energy: 0.88, durationSec: 280, genre: 'Progressive House', label: 'Pryda', mix: 'Original Extended', comments: 'Energy 9 - Progressive Climax', introBeats: 64, outroBeats: 64, hasInstrumentalIntro: true, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.92, speechiness: 0.04, valence: 0.76, danceability: 0.80, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_5', title: 'Losing It', artist: 'FISHER', bpm: 125, key: '11A', camelot: '11A', energy: 0.92, durationSec: 248, genre: 'Tech House', label: 'Catch & Release', mix: 'Extended Club Mix', comments: 'Energy 9 - Peak Tech House', introBeats: 32, outroBeats: 32, hasInstrumentalIntro: true, hasInstrumentalOutro: true, hasBreakdownCue: false, instrumentalness: 0.78, speechiness: 0.14, valence: 0.68, danceability: 0.90, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_6', title: 'Turn On The Lights again..', artist: 'Fred again.. & Swedish House Mafia', bpm: 128, key: '11A', camelot: '11A', energy: 0.95, durationSec: 267, genre: 'Tech House', label: 'Atlantic', mix: 'Club Mix', comments: 'Energy 10 - Peak Anthem', introBeats: 64, outroBeats: 32, hasInstrumentalIntro: false, hasInstrumentalOutro: false, hasBreakdownCue: true, instrumentalness: 0.28, speechiness: 0.35, valence: 0.74, danceability: 0.87, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_7', title: 'Rumble', artist: 'Skrillex, Fred again.. & Flowdan', bpm: 140, key: '6A', camelot: '6A', energy: 0.89, durationSec: 156, genre: 'Dubstep / Bass', label: 'OWSLA', mix: 'Radio Edit', comments: 'Energy 9 - Heavy 140 Bass', introBeats: 16, outroBeats: 16, hasInstrumentalIntro: false, hasInstrumentalOutro: false, hasBreakdownCue: false, instrumentalness: 0.18, speechiness: 0.44, valence: 0.22, danceability: 0.74, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_8', title: 'Miracle', artist: 'Calvin Harris & Ellie Goulding', bpm: 143, key: '8A', camelot: '8A', energy: 0.94, durationSec: 186, genre: 'Trance', label: 'Columbia', mix: 'Extended Mix', comments: 'Energy 9 - 90s Euro Trance', introBeats: 32, outroBeats: 32, hasInstrumentalIntro: false, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.20, speechiness: 0.34, valence: 0.88, danceability: 0.79, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_9', title: 'Glue', artist: 'Bicep', bpm: 130, key: '7A', camelot: '7A', energy: 0.65, durationSec: 269, genre: 'UK Garage / Breaks', label: 'Ninja Tune', mix: 'Original Mix', comments: 'Energy 6 - Melodic Breakbeat', introBeats: 32, outroBeats: 64, hasInstrumentalIntro: true, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.86, speechiness: 0.05, valence: 0.58, danceability: 0.76, targetLufs: -14.0, source: 'rekordbox_xml' },
      { id: 'demo_10', title: 'Sun & Moon', artist: 'Above & Beyond', bpm: 134, key: '1B', camelot: '1B', energy: 0.86, durationSec: 215, genre: 'Trance', label: 'Anjunabeats', mix: 'Club Mix', comments: 'Energy 8 - Euphoric Vocal Trance', introBeats: 64, outroBeats: 32, hasInstrumentalIntro: false, hasInstrumentalOutro: true, hasBreakdownCue: true, instrumentalness: 0.22, speechiness: 0.35, valence: 0.84, danceability: 0.77, targetLufs: -14.0, source: 'rekordbox_xml' },
    ];
    onTracksLoaded(sampleDemoTracks, 'Demo Festival Library (10 Tracks)');
  };

  return (
    <div className="bg-[#121520] border border-[#22293d] rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
      {/* Mode Switch Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#22293d] pb-4">
        <button
          onClick={() => setActiveTab('folder_xml')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'folder_xml'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 glow-cyan'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          Rekordbox XML Folder
        </button>

        <button
          onClick={() => setActiveTab('folder_m3u')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'folder_m3u'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
          }`}
        >
          <Music className="w-4 h-4" />
          M3U / M3U8 Playlists
        </button>

        <button
          onClick={() => setActiveTab('song_list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'song_list'
              ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 glow-magenta'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          Song List / Spotify API
        </button>

        <button
          onClick={loadSampleDemo}
          className="ml-auto flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium hover:border-amber-400 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Load Demo Library
        </button>
      </div>

      {/* File Dropzone for XML & M3U */}
      {activeTab !== 'song_list' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) {
              if (activeTab === 'folder_xml') handleXmlFiles(e.dataTransfer.files);
              else handleM3uFiles(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
              : 'border-[#2d3752] hover:border-zinc-500 bg-[#0d0f17]/60'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory={activeTab === 'folder_xml' ? '' : undefined}
            accept={activeTab === 'folder_xml' ? '.xml' : '.m3u,.m3u8'}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                if (activeTab === 'folder_xml') handleXmlFiles(e.target.files);
                else handleM3uFiles(e.target.files);
              }
            }}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#1b2033] flex items-center justify-center border border-[#2d3752]">
              <UploadCloud className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">
                {activeTab === 'folder_xml'
                  ? 'Drag & drop a folder with Rekordbox XML files here'
                  : 'Drag & drop M3U / M3U8 files or playlist folders here'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeTab === 'folder_xml'
                  ? 'Directly extracts BPM, Camelot keys, cue points, and tracks 100% offline'
                  : 'Extracts #EXTINF metadata and syncs track tempos and harmonic signatures'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Text List / Spotify API Search Input */
        <div className="space-y-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={5}
            placeholder={`Paste song titles and artists (one per line):
CamelPhat - Cola
Eric Prydz - Opus
Fred again.. - Rumble
Bicep - Glue`}
            className="w-full bg-[#0d0f17] border border-[#2d3752] rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50 font-mono"
          />
          <button
            onClick={handleTextSubmit}
            disabled={isLoading || !textInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg glow-magenta disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Querying Spotify Audio Analysis...' : 'Enrich & Sequence Tracklist'}
          </button>
        </div>
      )}
    </div>
  );
}
