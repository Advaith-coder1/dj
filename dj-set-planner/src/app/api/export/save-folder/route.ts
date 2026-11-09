import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import {
  generateRekordboxXml,
  generateM3u8,
  generateCueSheetText
} from '@/lib/exporters/zipExporter';
import { DJTrack, TransitionEvaluation } from '@/types/dj';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tracks: DJTrack[] = body.tracks || [];
    const transitions: TransitionEvaluation[] = body.transitions || [];
    const folderName: string = body.folderName || `Sorted_DJ_Set_${Date.now()}`;

    if (tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks to export' }, { status: 400 });
    }

    // Open native macOS Finder folder picker dialog
    const appleScript = `POSIX path of (choose folder with prompt "Choose where to save your Sorted DJ Folder:")`;
    let chosenParentDir = '';

    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', appleScript]);
      chosenParentDir = stdout.trim();
    } catch (err: any) {
      // User clicked "Cancel" in the Finder dialog
      if (err.message && err.message.includes('-128')) {
        return NextResponse.json({ cancelled: true });
      }
      return NextResponse.json({ fallbackToBrowser: true, reason: err.message });
    }

    if (!chosenParentDir) {
      return NextResponse.json({ cancelled: true });
    }

    // Create the Sorted DJ Folder inside the user's chosen directory
    const targetFolderPath = path.join(chosenParentDir, folderName);
    fs.mkdirSync(targetFolderPath, { recursive: true });

    // 1. Write 01_Rekordbox_Import.xml
    fs.writeFileSync(
      path.join(targetFolderPath, '01_Rekordbox_Import.xml'),
      generateRekordboxXml(tracks, folderName),
      'utf-8'
    );

    // 2. Write 02_Universal_Playlist.m3u8
    fs.writeFileSync(
      path.join(targetFolderPath, '02_Universal_Playlist.m3u8'),
      generateM3u8(tracks),
      'utf-8'
    );

    // 3. Write 03_DJ_Cue_Sheet.txt
    fs.writeFileSync(
      path.join(targetFolderPath, '03_DJ_Cue_Sheet.txt'),
      generateCueSheetText(tracks, transitions),
      'utf-8'
    );

    // 4. Write 04_Set_Analysis_Report.json
    const reportJson = JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          trackCount: tracks.length,
          averageBpm: (
            tracks.reduce((acc, t) => acc + t.bpm, 0) / tracks.length
          ).toFixed(1),
          energyProgression: tracks.map((t) => ({
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
    );
    fs.writeFileSync(
      path.join(targetFolderPath, '04_Set_Analysis_Report.json'),
      reportJson,
      'utf-8'
    );

    return NextResponse.json({
      saved: true,
      savedPath: targetFolderPath
    });
  } catch (err: any) {
    return NextResponse.json(
      { fallbackToBrowser: true, reason: err.message },
      { status: 200 }
    );
  }
}
