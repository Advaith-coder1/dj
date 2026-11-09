import JSZip from 'jszip';
import { DJTrack, TransitionEvaluation } from '@/types/dj';

export function generateRekordboxXml(tracks: DJTrack[], playlistName: string = 'Sorted DJ Set'): string {
  const collectionEntries = tracks.map((t, i) => `    <TRACK TrackID="${i + 1}" Name="${escapeXml(t.title)}" Artist="${escapeXml(t.artist)}" AverageBpm="${t.bpm.toFixed(2)}" Tonality="${t.camelot}" TotalTime="${t.durationSec}" Location="${escapeXml(t.filePath || '')}" />`).join('\n');

  const playlistTracks = tracks.map((_, i) => `        <TRACK Key="${i + 1}"/>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="DJ Set Planner" Version="1.0.0" Company="AntiGravity" />
  <COLLECTION Entries="${tracks.length}">
${collectionEntries}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT">
      <NODE Type="1" Name="${escapeXml(playlistName)}" KeyType="0" Entries="${tracks.length}">
${playlistTracks}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`;
}

export function generateM3u8(tracks: DJTrack[]): string {
  let content = '#EXTM3U\n';
  tracks.forEach((t) => {
    content += `#EXTINF:${t.durationSec},${t.artist} - ${t.title}\n`;
    content += `${t.filePath || `${t.artist} - ${t.title}.mp3`}\n`;
  });
  return content;
}

export function generateCueSheetText(tracks: DJTrack[], transitions: TransitionEvaluation[]): string {
  let output = '========================================================================================================================\n';
  output += '                                        DJ BOOTH CUE SHEET & SET ROADMAP                                                \n';
  output += `Generated: ${new Date().toLocaleString()} | Total Tracks: ${tracks.length}\n`;
  output += '========================================================================================================================\n\n';

  output += '#   EST. TIME   BPM    KEY   TRACK & ARTIST                                TRANSITION TYPE          NOTES\n';
  output += '------------------------------------------------------------------------------------------------------------------------\n';

  let runningSec = 0;

  tracks.forEach((t, i) => {
    const mins = Math.floor(runningSec / 60);
    const secs = runningSec % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const numStr = String(i + 1).padStart(2, '0');
    const bpmStr = t.bpm.toFixed(1).padEnd(6, ' ');
    const keyStr = t.camelot.padEnd(5, ' ');
    const songName = `${t.artist} - ${t.title}`.slice(0, 44).padEnd(45, ' ');

    let transStr = 'Intro Start'.padEnd(24, ' ');
    let noteStr = `Initial Groove (Energy: ${t.energy.toFixed(2)})`;

    if (i > 0 && transitions[i - 1]) {
      const trans = transitions[i - 1];
      transStr = trans.transitionTypeName.slice(0, 23).padEnd(24, ' ');
      noteStr = trans.customDJNote || trans.atmosphericNote;
    }

    output += `${numStr}  ${timeStr}       ${bpmStr} ${keyStr} ${songName} ${transStr} ${noteStr}\n`;

    if (i > 0 && transitions[i - 1]) {
      const trans = transitions[i - 1];
      if (trans.phraseAlignmentInstruction) {
        output += `    ├─ PHRASE LOCK : ${trans.phraseAlignmentInstruction}\n`;
      }
      if (trans.eqAutomationInstruction) {
        output += `    ├─ EQ & FADER  : [${trans.crossfaderCurve || 'Constant Power'}] ${trans.eqAutomationInstruction}\n`;
      }
      if (trans.stemDirective) {
        output += `    ├─ AI STEMS    : ${trans.stemDirective}\n`;
      }
      if (trans.gainStagingNote) {
        output += `    └─ LOUDNESS    : ${trans.gainStagingNote}\n`;
      }
    }

    runningSec += Math.round(t.durationSec * 0.75); // approx blend point
  });

  output += '\n========================================================================================================================\n';
  return output;
}

export async function createSortedFolderZip(
  tracks: DJTrack[],
  transitions: TransitionEvaluation[],
  setName: string = 'Sorted_DJ_Set'
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(setName) || zip;

  // 1. Rekordbox XML
  folder.file('01_Rekordbox_Import.xml', generateRekordboxXml(tracks, setName));

  // 2. M3U8 Playlist
  folder.file('02_Universal_Playlist.m3u8', generateM3u8(tracks));

  // 3. DJ Cue Sheet
  folder.file('03_DJ_Cue_Sheet.txt', generateCueSheetText(tracks, transitions));

  // 4. Set Analysis Report JSON
  folder.file('04_Set_Analysis_Report.json', JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      trackCount: tracks.length,
      averageBpm: (tracks.reduce((acc, t) => acc + t.bpm, 0) / tracks.length).toFixed(1),
      energyProgression: tracks.map(t => ({ title: t.title, bpm: t.bpm, camelot: t.camelot, energy: t.energy }))
    },
    transitions
  }, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
