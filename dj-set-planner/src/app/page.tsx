'use client';

import React, { useState, useEffect } from 'react';
import {
  DJTrack,
  EnergyCurveType,
  TransitionEvaluation,
  SavedTransition
} from '@/types/dj';
import IngestionDropzone from '@/components/IngestionDropzone';
import SetControls from '@/components/SetControls';
import TrajectoryChart from '@/components/TrajectoryChart';
import TrackSequenceTable from '@/components/TrackSequenceTable';
import ReserveTracksDrawer from '@/components/ReserveTracksDrawer';
import SaveTransitionModal from '@/components/SaveTransitionModal';
import PerformanceModeView from '@/components/PerformanceModeView';
import { evaluateTransition } from '@/lib/musical/transitionScorer';
import { sequenceTracks } from '@/lib/sequencing/tspOptimizer';
import { partitionTracksByDuration } from '@/lib/sequencing/knapsackFilter';
import {
  createSortedFolderZip,
  generateRekordboxXml,
  generateM3u8,
  generateCueSheetText
} from '@/lib/exporters/zipExporter';
import {
  getAllSavedTransitions,
  saveTransitionPair
} from '@/lib/storage/transitionMemory';
import {
  Disc,
  Download,
  MonitorPlay,
  FolderOpen,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

const ACTIVE_SET_STORAGE_KEY = 'antigravity_dj_active_tracks_v1';

export default function DJSetPlannerPage() {
  const [libraryTracks, setLibraryTracks] = useState<DJTrack[]>([]);
  const [activeTracks, setActiveTracks] = useState<DJTrack[]>([]);
  const [reserveTracks, setReserveTracks] = useState<DJTrack[]>([]);
  const [transitions, setTransitions] = useState<TransitionEvaluation[]>([]);
  const [savedMemory, setSavedMemory] = useState<SavedTransition[]>([]);

  const [durationMinutes, setDurationMinutes] = useState(60);
  const [curveType, setCurveType] = useState<EnergyCurveType>('ramp');
  const [prioritizeSavedMemory, setPrioritizeSavedMemory] = useState(true);
  const [librarySourceLabel, setLibrarySourceLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [savedExportPath, setSavedExportPath] = useState<string | null>(null);

  // Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedFromTrack, setSelectedFromTrack] = useState<DJTrack | null>(null);
  const [selectedToTrack, setSelectedToTrack] = useState<DJTrack | null>(null);
  const [selectedEval, setSelectedEval] = useState<TransitionEvaluation | null>(null);

  // Load saved memory from IndexedDB + check URL query for mini window performance mode
  useEffect(() => {
    getAllSavedTransitions().then((data) => setSavedMemory(data));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isPerf = params.get('perf') === '1';
      if (isPerf) {
        setIsPerformanceMode(true);
      }

      let loadedFromLocal = false;
      const cached = localStorage.getItem(ACTIVE_SET_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLibraryTracks(parsed);
            setActiveTracks(parsed);
            loadedFromLocal = true;
          }
        } catch {
          // ignore invalid cache
        }
      }

      // Also fetch shared state from /api/rekordbox/hud so the native macOS WKWebView HUD
      // (which does not share Chrome/Safari localStorage) always receives the active tracks
      fetch('/api/rekordbox/hud')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.tracks) && data.tracks.length > 0 && (!loadedFromLocal || isPerf)) {
            setLibraryTracks(data.tracks);
            setActiveTracks(data.tracks);
          }
        })
        .catch(() => {
          // ignore offline error
        });
    }
  }, []);

  // Sync activeTracks to localStorage AND server HUD store so the native floating HUD has instant access
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTracks.length > 0) {
      localStorage.setItem(ACTIVE_SET_STORAGE_KEY, JSON.stringify(activeTracks));
      const params = new URLSearchParams(window.location.search);
      if (params.get('hud') !== '1') {
        fetch('/api/rekordbox/hud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', tracks: activeTracks })
        }).catch(() => {});
      }
    }
  }, [activeTracks]);

  // Compute transitions whenever active sequence changes
  useEffect(() => {
    if (activeTracks.length <= 1) {
      setTransitions([]);
      return;
    }

    const calculated: TransitionEvaluation[] = [];
    for (let i = 0; i < activeTracks.length - 1; i++) {
      const evaluation = evaluateTransition(activeTracks[i], activeTracks[i + 1]);

      // Check if user has saved notes for this pairing
      const pairKey = `${activeTracks[i].artist} - ${activeTracks[i].title}`.toLowerCase() +
        '>>>' +
        `${activeTracks[i + 1].artist} - ${activeTracks[i + 1].title}`.toLowerCase();
      const match = savedMemory.find(
        (m) =>
          `${m.fromSignature.toLowerCase()}>>>${m.toSignature.toLowerCase()}` === pairKey
      );

      if (match) {
        evaluation.isSavedMemory = true;
        if (match.cueNote) evaluation.customDJNote = `⭐ [Saved Memory]: ${match.cueNote}`;
      }

      calculated.push(evaluation);
    }
    setTransitions(calculated);
  }, [activeTracks, savedMemory]);

  // Handler for loaded library
  const handleTracksLoaded = (tracks: DJTrack[], sourceName: string) => {
    setLibraryTracks(tracks);
    setLibrarySourceLabel(sourceName);
    runOptimizationOnTracks(tracks, durationMinutes, curveType, prioritizeSavedMemory);
  };

  // Run Knapsack + TSP Optimizer
  const runOptimizationOnTracks = (
    tracks: DJTrack[],
    duration: number,
    curve: EnergyCurveType,
    prioritize: boolean
  ) => {
    if (tracks.length === 0) return;

    // 1. Partition by duration
    const partition = partitionTracksByDuration(tracks, duration, curve);

    // 2. Sequence active tracks via TSP / Graph solver
    const optimizedSequence = sequenceTracks(
      partition.activeTracks,
      curve,
      savedMemory,
      prioritize
    );

    setActiveTracks(optimizedSequence);
    setReserveTracks(partition.reserveTracks);
  };

  const handleRunOptimization = () => {
    runOptimizationOnTracks(libraryTracks, durationMinutes, curveType, prioritizeSavedMemory);
  };

  // Manual re-order from table drag-and-drop
  const handleReorder = (newTracks: DJTrack[]) => {
    setActiveTracks(newTracks);
  };

  const handleMoveToReserve = (trackId: string) => {
    const track = activeTracks.find((t) => t.id === trackId);
    if (!track) return;
    setActiveTracks(activeTracks.filter((t) => t.id !== trackId));
    setReserveTracks([...reserveTracks, track]);
  };

  const handleAddBackToActive = (trackId: string) => {
    const track = reserveTracks.find((t) => t.id === trackId);
    if (!track) return;
    setReserveTracks(reserveTracks.filter((t) => t.id !== trackId));
    setActiveTracks([...activeTracks, track]);
  };

  const handleOpenSaveModal = (
    from: DJTrack,
    to: DJTrack,
    evalData: TransitionEvaluation
  ) => {
    setSelectedFromTrack(from);
    setSelectedToTrack(to);
    setSelectedEval(evalData);
    setSaveModalOpen(true);
  };

  const handleSaveTransition = async (saved: SavedTransition) => {
    await saveTransitionPair(saved);
    const updated = await getAllSavedTransitions();
    setSavedMemory(updated);
  };

  // Export Sorted DJ Folder to a user-chosen destination directory
  const handleDownloadZip = async () => {
    if (activeTracks.length === 0) return;
    setIsExporting(true);
    setSavedExportPath(null);

    const folderName = `Sorted_DJ_Set_${durationMinutes}min`;

    try {
      // 1. First try the native macOS Finder "Choose Folder" dialog via our local API route
      const res = await fetch('/api/export/save-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: activeTracks,
          transitions,
          folderName
        })
      });
      const data = await res.json();

      if (data.cancelled) {
        return; // User cancelled the Finder folder picker
      }

      if (data.saved && data.savedPath) {
        setSavedExportPath(data.savedPath);
        return;
      }

      // 2. Fallback: Browser File System Access API (showDirectoryPicker) to choose destination folder
      const win = window as unknown as {
        showDirectoryPicker?: (opts?: { mode?: string }) => Promise<any>;
        showSaveFilePicker?: (opts?: any) => Promise<any>;
      };

      if (typeof win.showDirectoryPicker === 'function') {
        try {
          const parentHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
          const subFolderHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });

          const writeTextFile = async (fileName: string, content: string) => {
            const fileHandle = await subFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
          };

          await writeTextFile('01_Rekordbox_Import.xml', generateRekordboxXml(activeTracks, folderName));
          await writeTextFile('02_Universal_Playlist.m3u8', generateM3u8(activeTracks));
          await writeTextFile('03_DJ_Cue_Sheet.txt', generateCueSheetText(activeTracks, transitions));
          await writeTextFile(
            '04_Set_Analysis_Report.json',
            JSON.stringify(
              {
                metadata: {
                  generatedAt: new Date().toISOString(),
                  trackCount: activeTracks.length,
                  averageBpm: (
                    activeTracks.reduce((acc, t) => acc + t.bpm, 0) / activeTracks.length
                  ).toFixed(1),
                  energyProgression: activeTracks.map((t) => ({
                    title: t.title,
                    artist: t.artist,
                    genre: t.genre,
                    bpm: t.bpm,
                    camelot: t.camelot,
                    energy: t.energy
                  }))
                },
                transitions
              },
              null,
              2
            )
          );

          setSavedExportPath(`${parentHandle.name}/${folderName}`);
          return;
        } catch (pickerErr: any) {
          if (pickerErr?.name === 'AbortError') return;
        }
      }

      // 3. Fallback: Save ZIP via showSaveFilePicker or standard download
      const zipBlob = await createSortedFolderZip(
        activeTracks,
        transitions,
        folderName
      );

      if (typeof win.showSaveFilePicker === 'function') {
        try {
          const saveHandle = await win.showSaveFilePicker({
            suggestedName: `${folderName}.zip`,
            types: [
              {
                description: 'Sorted DJ Set Archive (.zip)',
                accept: { 'application/zip': ['.zip'] }
              }
            ]
          });
          const writable = await saveHandle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          setSavedExportPath(saveHandle.name);
          return;
        } catch (saveErr: any) {
          if (saveErr?.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error generating export bundle: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const totalMinutes = Math.round(activeTracks.reduce((acc, t) => acc + t.durationSec, 0) / 60);

  // Launch native macOS Always-On-Top Floating HUD Window (works over Full-Screen Rekordbox)
  const handleLaunchFloatingHud = async () => {
    if (activeTracks.length === 0) return;

    try {
      const res = await fetch('/api/rekordbox/hud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          tracks: activeTracks
        })
      });
      const data = await res.json();
      if (data.launched) {
        return;
      }
    } catch {
      // Fallback to browser popup window below
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

  // Render Rekordbox-matched minimal Performance Mode when enabled
  if (isPerformanceMode) {
    return (
      <PerformanceModeView
        tracks={activeTracks}
        transitions={transitions}
        onExitPerformanceMode={() => setIsPerformanceMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1b2033] bg-[#0c0e17]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center glow-cyan shadow-lg">
            <Disc className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white flex items-center gap-2">
              ANTIGRAVITY <span className="text-cyan-400">DJ ARCHITECT</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">
              Harmonic Set-Progression Engine • Rekordbox & M3U
            </p>
          </div>
        </div>

        {activeTracks.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 text-xs font-mono bg-[#121520] border border-[#22293d] px-3.5 py-1.5 rounded-lg">
              <span className="text-zinc-400">
                Active: <b className="text-white">{activeTracks.length}</b> tracks
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">
                Duration: <b className="text-cyan-400">{totalMinutes}m</b>
              </span>
            </div>

            {/* Always-On-Top Floating Mini Window Button (Works over Full-Screen Rekordbox) */}
            <button
              onClick={handleLaunchFloatingHud}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#16222f] hover:bg-[#1f3145] text-[#00d8ff] border border-[#00a2ff] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              title="Open small Always-On-Top floating HUD window (stays in front even when Rekordbox is in Full Screen)"
            >
              <ExternalLink className="w-4 h-4" />
              Mini Window
            </button>

            {/* Rekordbox Performance Mode Button */}
            <button
              onClick={() => setIsPerformanceMode(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1c1f26] hover:bg-[#262b36] text-[#00a2ff] border border-[#00a2ff]/50 font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Switch this tab to Rekordbox-matched Performance Mode"
            >
              <MonitorPlay className="w-4 h-4" />
              Performance Mode
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all glow-cyan cursor-pointer"
              title="Choose destination directory to save your Sorted DJ Folder"
            >
              <FolderOpen className="w-4 h-4" />
              {isExporting ? 'Choose Destination...' : 'Download Sorted DJ Folder'}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Saved Folder Confirmation Banner */}
        {savedExportPath && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Sorted DJ Folder saved to:{' '}
                <code className="bg-black/40 border border-emerald-500/30 px-2 py-0.5 rounded font-mono text-emerald-200">
                  {savedExportPath}
                </code>
              </span>
            </div>
            <button
              onClick={() => setSavedExportPath(null)}
              className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Ingestion Section */}
        <IngestionDropzone
          onTracksLoaded={handleTracksLoaded}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />

        {/* Configuration Bar */}
        {libraryTracks.length > 0 && (
          <SetControls
            durationMinutes={durationMinutes}
            setDurationMinutes={setDurationMinutes}
            curveType={curveType}
            setCurveType={setCurveType}
            prioritizeSavedMemory={prioritizeSavedMemory}
            setPrioritizeSavedMemory={setPrioritizeSavedMemory}
            onRunOptimization={handleRunOptimization}
            totalLibraryCount={libraryTracks.length}
          />
        )}

        {/* Trajectory Visualizer */}
        {activeTracks.length > 0 && (
          <TrajectoryChart tracks={activeTracks} />
        )}

        {/* Sequenced Table */}
        {activeTracks.length > 0 && (
          <TrackSequenceTable
            tracks={activeTracks}
            transitions={transitions}
            onReorder={handleReorder}
            onOpenSaveModal={handleOpenSaveModal}
            onMoveToReserve={handleMoveToReserve}
          />
        )}

        {/* Reserve Pool Drawer */}
        {reserveTracks.length > 0 && (
          <ReserveTracksDrawer
            reserveTracks={reserveTracks}
            onAddBackToActive={handleAddBackToActive}
          />
        )}

        {/* Save Transition Modal */}
        <SaveTransitionModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          fromTrack={selectedFromTrack}
          toTrack={selectedToTrack}
          evalData={selectedEval}
          onSave={handleSaveTransition}
        />
      </main>
    </div>
  );
}
