import { DJTrack } from '@/types/dj';
import { normalizeCamelot } from '../musical/camelot';

export function parseM3u(content: string): DJTrack[] {
  const lines = content.split(/\r?\n/);
  const tracks: DJTrack[] = [];

  let currentTitle = '';
  let currentArtist = '';
  let currentDuration = 210;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Example: #EXTINF:240,Artist Name - Song Title
      const match = line.match(/^#EXTINF:(-?\d+),(.*)$/);
      if (match) {
        currentDuration = parseInt(match[1], 10) > 0 ? parseInt(match[1], 10) : 210;
        const rawMeta = match[2];
        if (rawMeta.includes(' - ')) {
          const parts = rawMeta.split(' - ');
          currentArtist = parts[0].trim();
          currentTitle = parts.slice(1).join(' - ').trim();
        } else {
          currentArtist = 'Unknown Artist';
          currentTitle = rawMeta.trim();
        }
      }
    } else if (!line.startsWith('#')) {
      // File path or URL
      const fallbackTitle = currentTitle || line.split(/[\/\\]/).pop()?.replace(/\.[^/.]+$/, '') || `Track ${tracks.length + 1}`;
      const artist = currentArtist || 'Unknown Artist';

      tracks.push({
        id: `m3u_${tracks.length}_${Date.now()}`,
        title: fallbackTitle,
        artist,
        bpm: 124, // default, will be enriched via Spotify or simulated
        key: '8A',
        camelot: normalizeCamelot('8A'),
        energy: 0.65,
        durationSec: currentDuration,
        source: 'm3u',
        filePath: line
      });

      // Reset temp vars
      currentTitle = '';
      currentArtist = '';
      currentDuration = 210;
    }
  }

  return tracks;
}
