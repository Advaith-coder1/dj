import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  try {
    const homeDir = os.homedir();
    const rbDir = path.join(homeDir, 'Library', 'Pioneer', 'rekordbox');

    if (!fs.existsSync(rbDir)) {
      return NextResponse.json({
        connected: false,
        reason: 'Rekordbox folder not found at ~/Library/Pioneer/rekordbox'
      });
    }

    // Check modification timestamps of Rekordbox log/datafile to detect deck/history updates
    const files = fs.readdirSync(rbDir);
    let latestMtime = 0;
    let latestFile = '';

    for (const file of files) {
      if (file.endsWith('.db') || file.endsWith('.log') || file.endsWith('.xml') || file.endsWith('.txt')) {
        const fullPath = path.join(rbDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestFile = file;
          }
        } catch {
          // ignore permission errors on locked files
        }
      }
    }

    return NextResponse.json({
      connected: true,
      lastModifiedMs: latestMtime,
      watchedFile: latestFile
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      reason: err.message
    });
  }
}
