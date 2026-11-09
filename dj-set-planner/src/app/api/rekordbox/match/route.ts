import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

interface TrackInput {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSec: number;
}

export async function POST(req: NextRequest) {
  const tmpFile = path.join(os.tmpdir(), `rb_screen_${Date.now()}.png`);

  try {
    const body = await req.json();
    const tracks: TrackInput[] = body.tracks || [];
    const currentIndex: number = body.currentIndex ?? 0;
    const imageBase64: string | undefined = body.imageBase64;

    if (imageBase64) {
      // Browser-captured screen frame
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'));
    } else {
      // Capture main display silently via macOS screencapture
      await execFileAsync('/usr/sbin/screencapture', ['-x', '-m', tmpFile]);
    }

    if (!fs.existsSync(tmpFile)) {
      return NextResponse.json(
        {
          matched: false,
          reason: 'Screen capture requires macOS Screen Recording permission.'
        },
        { status: 200 }
      );
    }

    // Run compiled Apple Vision OCR helper (or fallback to swift script)
    const binaryPath = path.join(process.cwd(), 'scripts', 'ocr_helper');
    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr_helper.swift');

    let stdout = '[]';
    if (fs.existsSync(binaryPath)) {
      const res = await execFileAsync(binaryPath, [tmpFile]);
      stdout = res.stdout;
    } else {
      const res = await execFileAsync('/usr/bin/swift', [scriptPath, tmpFile]);
      stdout = res.stdout;
    }

    // Clean up temporary screenshot
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup error
    }

    const ocrLines: string[] = JSON.parse(stdout.trim() || '[]');
    const joinedText = ocrLines.join(' \n ').toLowerCase();

    // 1. Match which track from the set is visible on Rekordbox Deck
    let bestTrackIdx = currentIndex;
    let bestScore = 0;

    tracks.forEach((t, idx) => {
      const cleanTitle = t.title.toLowerCase().trim();
      const cleanArtist = t.artist.toLowerCase().trim();
      let score = 0;

      if (cleanTitle.length >= 3 && joinedText.includes(cleanTitle)) {
        score += 10 + cleanTitle.length;
      } else {
        // Token overlap
        const words = cleanTitle.split(/\s+/).filter((w) => w.length > 3);
        for (const w of words) {
          if (joinedText.includes(w)) score += 3;
        }
      }

      if (cleanArtist.length >= 3 && joinedText.includes(cleanArtist)) {
        score += 6;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTrackIdx = idx;
      }
    });

    const targetTrack = tracks[bestTrackIdx] || tracks[currentIndex];

    // 2. Extract Rekordbox Deck Timer (e.g. "01:24", "-02:15", "01:42.5")
    // Rekordbox displays deck time as MM:SS or -MM:SS (with optional .d tenths)
    let detectedElapsedSec: number | null = null;
    const timeRegex = /(-?\b0?[0-9]:[0-5][0-9])(?:\.[0-9])?\b/g;
    const candidates: { sec: number; isRemain: boolean; raw: string }[] = [];

    for (const line of ocrLines) {
      // Ignore clock times like 23:52 or total set times > 12 mins
      const matches = line.matchAll(timeRegex);
      for (const m of matches) {
        const raw = m[1];
        const isRemain = raw.startsWith('-');
        const clean = raw.replace('-', '');
        const [mmStr, ssStr] = clean.split(':');
        const mm = parseInt(mmStr, 10);
        const ss = parseInt(ssStr, 10);
        const totalSec = mm * 60 + ss;

        if (
          targetTrack &&
          totalSec > 0 &&
          totalSec < targetTrack.durationSec
        ) {
          candidates.push({ sec: totalSec, isRemain, raw });
        }
      }
    }

    if (candidates.length > 0 && targetTrack) {
      // Prefer remaining time (-MM:SS) if Rekordbox is in Remain mode, else first valid deck timer
      const remainCandidate = candidates.find((c) => c.isRemain);
      const chosen = remainCandidate || candidates[0];
      detectedElapsedSec = chosen.isRemain
        ? Math.max(0, targetTrack.durationSec - chosen.sec)
        : chosen.sec;
    }

    return NextResponse.json({
      matched: bestScore > 0 || detectedElapsedSec !== null,
      matchedTrackIndex: bestTrackIdx,
      matchedTrackTitle: targetTrack?.title || null,
      detectedElapsedSec,
      ocrLinesCount: ocrLines.length
    });
  } catch (err: any) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {}
    return NextResponse.json(
      { matched: false, reason: err.message },
      { status: 200 }
    );
  }
}
