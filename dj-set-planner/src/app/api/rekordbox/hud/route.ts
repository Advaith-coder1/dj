import { NextRequest, NextResponse } from 'next/server';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const STATE_FILE_PATH = '/tmp/antigravity_dj_active_set.json';

export async function GET() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        tracks: parsed.tracks || [],
        updatedAt: parsed.updatedAt || null
      });
    }
    return NextResponse.json({ tracks: [] });
  } catch (err: any) {
    return NextResponse.json({ tracks: [], error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action: 'sync' | 'open' | 'close' = body.action || 'open';

    // Persist active tracks so the native macOS HUD window's WKWebView always has the current set
    if (Array.isArray(body.tracks) && body.tracks.length > 0) {
      fs.writeFileSync(
        STATE_FILE_PATH,
        JSON.stringify({
          tracks: body.tracks,
          updatedAt: Date.now()
        }),
        'utf-8'
      );
    }

    if (action === 'sync') {
      return NextResponse.json({ synced: true });
    }

    if (action === 'close') {
      try {
        execSync('pkill -f "scripts/hud_window"');
      } catch {
        // Ignore if not running
      }
      return NextResponse.json({ closed: true });
    }

    // action === 'open': Launch native macOS Always-On-Top Floating HUD Window
    const hudBinaryPath = path.join(process.cwd(), 'scripts', 'hud_window');
    if (!fs.existsSync(hudBinaryPath)) {
      return NextResponse.json(
        { launched: false, reason: 'hud_window binary not found' },
        { status: 200 }
      );
    }

    // Close any existing instance so the window cleanly pops to the front
    try {
      execSync('pkill -f "scripts/hud_window"');
    } catch {
      // Ignore if not running
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const targetUrl = `${origin}/?perf=1&hud=1`;

    const child = spawn(hudBinaryPath, [targetUrl], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return NextResponse.json({
      launched: true,
      mode: 'native_macos_fullscreen_hud',
      targetUrl
    });
  } catch (err: any) {
    return NextResponse.json(
      { launched: false, reason: err.message },
      { status: 200 }
    );
  }
}
