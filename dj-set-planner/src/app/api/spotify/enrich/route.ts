import { NextRequest, NextResponse } from 'next/server';
import { DJTrack } from '@/types/dj';
import { normalizeCamelot, spotifyToCamelot } from '@/lib/musical/camelot';

export async function POST(req: NextRequest) {
  try {
    const { items, clientId, clientSecret } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items array' }, { status: 400 });
    }

    // If client provided credentials and wants live Spotify API calls
    if (clientId && clientSecret) {
      try {
        const enriched = await enrichViaRealSpotify(items, clientId, clientSecret);
        return NextResponse.json({ tracks: enriched, source: 'spotify_api' });
      } catch (apiErr: any) {
        console.warn('Spotify live API call failed, falling back to smart simulation:', apiErr.message);
      }
    }

    // Offline / Mock Simulation Mode
    // Deterministically simulates realistic BPM, Camelot Key, Energy, Instrumentalness, Speechiness, and Valence
    const enrichedTracks: DJTrack[] = items.map((item: { title: string; artist: string }, idx: number) => {
      const hash = hashString(`${item.artist}_${item.title}`);

      const bpm = 122 + (hash % 11);
      const camelotNumber = 1 + (hash % 12);
      const camelotLetter = hash % 2 === 0 ? 'A' : 'B';
      const camelot = `${camelotNumber}${camelotLetter}` as any;
      const energy = 0.45 + ((hash % 50) / 100);

      // Section 4.1 & 4.2: Acoustic features
      const isVocalTitle = /feat\.|ft\.|vocal|love|you|me|lights|miracle/i.test(item.title);
      const instrumentalness = isVocalTitle ? 0.18 : 0.35 + ((hash % 60) / 100);
      const speechiness = isVocalTitle ? 0.35 : 0.06 + ((hash % 20) / 100);
      const valence = camelotLetter === 'B' ? 0.65 + ((hash % 28) / 100) : 0.25 + ((hash % 45) / 100);
      const danceability = 0.72 + ((hash % 22) / 100);

      return {
        id: `sim_spotify_${idx}_${Date.now()}`,
        title: item.title || `Track ${idx + 1}`,
        artist: item.artist || 'Unknown Artist',
        bpm,
        key: camelot,
        camelot: normalizeCamelot(camelot),
        energy: Math.round(energy * 100) / 100,
        durationSec: 210 + (hash % 90),
        instrumentalness: Math.round(instrumentalness * 100) / 100,
        speechiness: Math.round(speechiness * 100) / 100,
        valence: Math.round(valence * 100) / 100,
        danceability: Math.round(danceability * 100) / 100,
        introBeats: 32,
        outroBeats: 32,
        targetLufs: -14.0,
        source: 'text_spotify'
      };
    });

    return NextResponse.json({ tracks: enrichedTracks, source: 'simulation_fallback' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function enrichViaRealSpotify(
  items: { title: string; artist: string }[],
  clientId: string,
  clientSecret: string
): Promise<DJTrack[]> {
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to authenticate with Spotify API: ${tokenRes.statusText}`);
  }

  const { access_token } = await tokenRes.json();
  const tracks: DJTrack[] = [];

  for (let i = 0; i < items.length; i++) {
    const { title, artist } = items[i];
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const spotifyTrack = searchData.tracks?.items?.[0];

      if (spotifyTrack) {
        const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features/${spotifyTrack.id}`, {
          headers: { Authorization: `Bearer ${access_token}` }
        });

        if (featuresRes.ok) {
          const features = await featuresRes.json();
          const camelot = spotifyToCamelot(features.key, features.mode);
          tracks.push({
            id: `spot_${spotifyTrack.id}`,
            title: spotifyTrack.name,
            artist: spotifyTrack.artists?.map((a: any) => a.name).join(', ') || artist,
            bpm: Math.round(features.tempo * 10) / 10,
            key: camelot,
            camelot,
            energy: features.energy,
            durationSec: Math.round(features.duration_ms / 1000),
            instrumentalness: features.instrumentalness ?? 0.5,
            speechiness: features.speechiness ?? 0.1,
            valence: features.valence ?? 0.5,
            danceability: features.danceability ?? 0.75,
            introBeats: 32,
            outroBeats: 32,
            targetLufs: -14.0,
            source: 'text_spotify',
            spotifyId: spotifyTrack.id
          });
          continue;
        }
      }
    }

    tracks.push({
      id: `spot_fallback_${i}`,
      title,
      artist,
      bpm: 124,
      key: '8A',
      camelot: normalizeCamelot('8A'),
      energy: 0.65,
      durationSec: 210,
      instrumentalness: 0.6,
      speechiness: 0.1,
      valence: 0.5,
      danceability: 0.78,
      introBeats: 32,
      outroBeats: 32,
      targetLufs: -14.0,
      source: 'text_spotify'
    });
  }

  return tracks;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
