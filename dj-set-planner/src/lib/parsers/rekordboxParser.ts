import { XMLParser } from 'fast-xml-parser';
import { DJTrack, RekordboxPositionMark, RekordboxTempoGrid } from '@/types/dj';
import { normalizeCamelot } from '../musical/camelot';
import { resolveCanonicalGenre } from '../musical/genreGraph';

// Section 2.1 Table: Rekordbox Colour Hexadecimal -> Energy Override
function parseRekordboxColourEnergyOverride(colourHex?: string): number | null {
  if (!colourHex) return null;
  const clean = colourHex.trim().toLowerCase();

  // Red / Rose / Magenta -> Peak Energy (0xFF0000, 0xFF007F, etc.)
  if (clean.includes('ff0000') || clean.includes('ff007f') || clean === 'red') {
    return 0.94;
  }
  // Orange / Gold -> High Peak Builder (0xFFA500, 0xFFFF00)
  if (clean.includes('ffa500') || clean.includes('ff8000') || clean.includes('ffff00')) {
    return 0.84;
  }
  // Green -> Mid-Groove Club Flow (0x00FF00)
  if (clean.includes('00ff00')) {
    return 0.70;
  }
  // Blue / Aqua / Cyan -> Deep Warm-Up (0x0000FF, 0x00FFFF, 0x25FDE9)
  if (
    clean.includes('0000ff') ||
    clean.includes('00ffff') ||
    clean.includes('25fde9') ||
    clean === 'blue'
  ) {
    return 0.46;
  }
  return null;
}

export function parseRekordboxXml(xmlContent: string): DJTrack[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const parsed = parser.parse(xmlContent);
  const collection = parsed?.DJ_PLAYLISTS?.COLLECTION?.TRACK;

  if (!collection) {
    return [];
  }

  const rawTracks = Array.isArray(collection) ? collection : [collection];

  return rawTracks.map((t, idx) => {
    const title = t['@_Name'] || `Track ${idx + 1}`;
    const artist = t['@_Artist'] || 'Unknown Artist';
    const bpm = parseFloat(t['@_AverageBpm'] || '124') || 124;
    const rawKey = t['@_Tonality'] || '8A';
    const camelot = normalizeCamelot(rawKey);
    const durationSec = parseInt(t['@_TotalTime'] || '210', 10) || 210;
    const filePath = t['@_Location'] || '';

    // Section 2.1: Expanded <TRACK> semantic attributes (excluding Year per user directive)
    const rawGenre = t['@_Genre'] || '';
    const label = t['@_Label'] || '';
    const remixer = t['@_Remixer'] || '';
    const mix = t['@_Mix'] || '';
    const comments = t['@_Comments'] || '';
    const colour = t['@_Colour'] || '';

    // Section 2.2: Extract <TEMPO> beatgrid node
    const rawTempoNode = Array.isArray(t.TEMPO) ? t.TEMPO[0] : t.TEMPO;
    const tempoGrid: RekordboxTempoGrid = {
      inizioSec: parseFloat(rawTempoNode?.['@_Inizio'] || '0') || 0,
      bpm: parseFloat(rawTempoNode?.['@_Bpm'] || String(bpm)) || bpm,
      metro: rawTempoNode?.['@_Metro'] || '4/4',
      battito: parseInt(rawTempoNode?.['@_Battito'] || '1', 10) || 1
    };

    const secondsPerBeat = 60 / tempoGrid.bpm;

    // Section 2.2: Extract <POSITION_MARK> structural phrase markers & convert seconds to beat indices
    const rawMarks = t.POSITION_MARK
      ? Array.isArray(t.POSITION_MARK)
        ? t.POSITION_MARK
        : [t.POSITION_MARK]
      : [];

    const positionMarks: RekordboxPositionMark[] = rawMarks
      .map((pm: any) => {
        const startSec = parseFloat(pm['@_Start'] || '0') || 0;
        const endSec = pm['@_End'] !== undefined ? parseFloat(pm['@_End']) : undefined;
        const beatIndex = Math.max(
          1,
          Math.round((startSec - tempoGrid.inizioSec) / secondsPerBeat) + 1
        );
        const durationBeats =
          endSec !== undefined && endSec > startSec
            ? Math.max(4, Math.round((endSec - startSec) / secondsPerBeat))
            : undefined;

        return {
          name: String(pm['@_Name'] || 'Cue'),
          type: parseInt(pm['@_Type'] || '0', 10) || 0,
          startSec,
          endSec,
          num: parseInt(pm['@_Num'] ?? '-1', 10),
          beatIndex,
          durationBeats
        };
      })
      .sort((a: RekordboxPositionMark, b: RekordboxPositionMark) => a.startSec - b.startSec);

    // Derive structural phrase lengths (Intro / Outro in beats) & cue semantics
    let introBeats = /extended|club|original/i.test(mix) ? 64 : /radio|short/i.test(mix) ? 16 : 32;
    let outroBeats = /extended|club|original/i.test(mix) ? 64 : /radio|short/i.test(mix) ? 16 : 32;
    let hasInstrumentalIntro = /extended|club|dub|instrumental/i.test(`${mix} ${comments}`);
    let hasInstrumentalOutro = /extended|club|dub|instrumental/i.test(`${mix} ${comments}`);
    let hasBreakdownCue = false;

    for (let i = 0; i < positionMarks.length; i++) {
      const mark = positionMarks[i];
      const lname = mark.name.toLowerCase();

      if (lname.includes('intro')) {
        if (mark.durationBeats) {
          introBeats = mark.durationBeats;
        } else if (positionMarks[i + 1]) {
          introBeats = Math.max(
            16,
            Math.round((positionMarks[i + 1].startSec - mark.startSec) / secondsPerBeat / 16) * 16
          );
        }
        if (lname.includes('inst')) hasInstrumentalIntro = true;
      }

      if (lname.includes('outro')) {
        if (mark.durationBeats) {
          outroBeats = mark.durationBeats;
        } else {
          outroBeats = Math.max(
            16,
            Math.min(128, Math.round((durationSec - mark.startSec) / secondsPerBeat / 16) * 16)
          );
        }
        if (lname.includes('inst')) hasInstrumentalOutro = true;
      }

      if (lname.includes('break') || lname.includes('ambient') || lname.includes('bridge')) {
        hasBreakdownCue = true;
      }

      if (lname.includes('instrumental')) {
        if (mark.startSec < durationSec * 0.3) hasInstrumentalIntro = true;
        if (mark.startSec > durationSec * 0.65) hasInstrumentalOutro = true;
      }
    }

    // Energy calculation with Comments & Colour hex override (Table 2.1)
    const bitRate = parseInt(t['@_BitRate'] || '320', 10);
    let energy = Math.min(0.95, Math.max(0.40, (bpm - 100) / 40 + (bitRate >= 320 ? 0.1 : 0)));

    const mikMatch = comments.match(/\benergy\s*[:=-]?\s*(10|[1-9])\b/i);
    if (mikMatch) {
      energy = parseInt(mikMatch[1], 10) / 10;
    } else if (/peak|banger|festival|rave/i.test(comments)) {
      energy = Math.min(0.96, energy + 0.15);
    } else if (/warmup|warm-up|chill|lounge|deep|opening/i.test(comments)) {
      energy = Math.max(0.38, energy - 0.15);
    }

    const colourOverride = parseRekordboxColourEnergyOverride(colour);
    if (colourOverride !== null) {
      energy = colourOverride;
    }

    // Section 4.1 & 4.2: Acoustic Profile Estimation (Instrumentalness, Speechiness, Valence, Danceability)
    const allText = `${title} ${comments} ${mix} ${rawGenre}`.toLowerCase();
    const hasVocalTag =
      /vocal|feat\.|ft\.|lyrics|singer|rap|acapella|radio edit/i.test(allText) ||
      positionMarks.some((m) => /vocal|verse|chorus/i.test(m.name));
    const hasExplicitInstTag = /instrumental|dub mix|club tool/i.test(allText);

    const instrumentalness = hasExplicitInstTag ? 0.85 : hasVocalTag ? 0.22 : 0.62;
    const speechiness = /rap|hip-hop|spoken|flowdan|mc /i.test(allText)
      ? 0.42
      : hasVocalTag
      ? 0.36
      : 0.08;

    // Valence (0.0 dark/industrial -> 1.0 bright/euphoric)
    let valence = camelot.endsWith('B') ? 0.72 : 0.42;
    if (/dark|industrial|acid|hypnotic|afterlife|drumcode/i.test(`${allText} ${label}`)) {
      valence = Math.max(0.12, valence - 0.24);
    } else if (/euphoric|uplifting|disco|funk|happy|anthem|sun/i.test(`${allText} ${label}`)) {
      valence = Math.min(0.92, valence + 0.22);
    }

    const danceability = bpm >= 118 && bpm <= 132 ? 0.84 : 0.72;

    const tempTrack: DJTrack = {
      id: `rb_${t['@_TrackID'] || idx}_${Date.now()}_${idx}`,
      title,
      artist,
      bpm: Math.round(bpm * 10) / 10,
      key: rawKey,
      camelot,
      energy: Math.round(energy * 100) / 100,
      durationSec,
      source: 'rekordbox_xml',
      genre: rawGenre || undefined,
      label: label || undefined,
      remixer: remixer || undefined,
      mix: mix || undefined,
      comments: comments || undefined,
      colour: colour || undefined,
      tempoGrid,
      positionMarks: positionMarks.length > 0 ? positionMarks : undefined,
      introBeats,
      outroBeats,
      hasInstrumentalIntro,
      hasInstrumentalOutro,
      hasBreakdownCue,
      instrumentalness,
      speechiness,
      valence: Math.round(valence * 100) / 100,
      danceability,
      targetLufs: -14.0,
      filePath
    };

    tempTrack.genre = rawGenre.trim() || resolveCanonicalGenre(tempTrack);

    return tempTrack;
  });
}
