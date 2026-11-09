import { TransitionType } from '@/types/dj';

export interface TransitionGuideInfo {
  title: string;
  shortTag: string;
  whatItIs: string;
  howToMix: string;
  atmosphereEffect: string;
  accentColor: string;
}

export const TRANSITION_GUIDE: Record<TransitionType, TransitionGuideInfo> = {
  long_blend: {
    title: 'Long Phrased Blend (32–64 Beats)',
    shortTag: '64B BLEND',
    whatItIs: 'A gradual, phrase-locked overlap of two harmonically & rhythmically matched tracks over 8 to 16 bars using a Constant Power crossfade curve.',
    howToMix: 'Subtractive EQ Rule: Start Track B with Low EQ at 0% (-26dB/Iso). At Bar 9 (Beat 33), execute a Hard Phrase Bass Swap (snap Track A Low to 0% and Track B Low to 100%).',
    atmosphereEffect: 'Hypnotic & continuous — keeps dancers locked in a 4/4 groove with zero sub-bass comb filtering.',
    accentColor: '#00d084'
  },
  short_blend: {
    title: 'Short Phrase Blend (16 Beats)',
    shortTag: '16B BLEND',
    whatItIs: 'A tight 4-bar (16-beat) phrase transition designed for +2/+7 Energy Boosts or Diagonal Key Modulations where extended melodic overlap would clash.',
    howToMix: 'Bring in Track B over the final 16 beats of Track A’s phrase with Track B Low EQ cut, then swap bass & cut Track A on Beat 1 of the new phrase.',
    atmosphereEffect: 'Maintains groove momentum while preventing scale-note friction during key modulations.',
    accentColor: '#00d084'
  },
  stem_blend: {
    title: 'AI Stem-Separated Blend (64 Beats)',
    shortTag: 'STEM 64B',
    whatItIs: 'Uses real-time AI Stem Separation (Vocals, Melody, Bass, Drums) to blend two vocal-heavy tracks that would otherwise trigger a Vocal Clash.',
    howToMix: 'MUTE(TrackB.VocalStem) from Beat 1 to Beat 64 while blending drums/melody. Execute SWAP(TrackA.BassStem, TrackB.BassStem) at Beat 33, then unmute Track B vocals on the drop.',
    atmosphereEffect: 'Studio-grade live mashup — eliminates lyrical cacophony while preserving full harmonic & rhythmic flow.',
    accentColor: '#00ff9d'
  },
  drop_mix: {
    title: 'Drop Mix / Bass Swap on Beat 1',
    shortTag: '⚡ DROP MIX',
    whatItIs: 'A high-impact transition that swaps directly into the incoming track’s main drop or chorus using a Sharp Cut fader curve.',
    howToMix: 'Align Track B’s build-up with Track A’s pre-drop. On Beat 1 of the drop, cut Track A completely and slam Track B at 100% volume & full Low EQ.',
    atmosphereEffect: 'Explosive dopamine rush — ideal for +2/+7 key boosts, Radio Edits, and peak-hour energy spikes.',
    accentColor: '#ffbe2e'
  },
  cold_cut: {
    title: 'Hard Cut on Beat 1 (Sharp Curve)',
    shortTag: 'HARD CUT',
    whatItIs: 'An instant, unblended cut on the 1-downbeat of a structural phrase using a 1mm Sharp Cut crossfader geometry.',
    howToMix: 'Stop Track A cleanly on Beat 4 of the outgoing bar while simultaneously hitting Play on Beat 1 of Track B at full volume.',
    atmosphereEffect: 'Prevents Tonal Interval Space (TIS) sensory dissonance, vocal clashes, and drum-grid chaos on Genre Pivots.',
    accentColor: '#00d8ff'
  },
  echo_out: {
    title: 'Echo Cut / 1/4-Note Delay Tail',
    shortTag: 'ECHO CUT',
    whatItIs: 'Applies a tempo-synced 1/4-note delay tail to Song A, cutting its dry volume on the downbeat while the echo rings out over Song B’s intro.',
    howToMix: 'Engage 1/4-note Echo FX (40% wet) on Track A, snap Track A’s channel fader to 0 on Beat 1, and drop Track B underneath the decaying delay tail.',
    atmosphereEffect: 'Masks sudden changes in drum groove (Genre Pivots), large >4% BPM shifts, or TIS harmonic clashes.',
    accentColor: '#ff6b6b'
  },
  filter_sweep: {
    title: 'High-Pass Filter (HPF) Handoff',
    shortTag: 'HPF SWEEP',
    whatItIs: 'Sweeps the outgoing track’s High-Pass Filter upward from 20 Hz into the midrange (250 Hz+) to remove low-end rhythmic friction.',
    howToMix: 'Gradually sweep Track A’s HPF knob clockwise from 20 Hz to 300 Hz while bringing in Track B’s kick and bassline.',
    atmosphereEffect: 'Carves clean sub-bass space and bridges sibling sub-genres without phase cancellation.',
    accentColor: '#ff6b6b'
  },
  reverb_wash: {
    title: 'Reverb Washout (Ambient Tail)',
    shortTag: 'WASH OUT',
    whatItIs: 'Dissolves the outgoing track into a lush reverb cloud before introducing a deeper groove.',
    howToMix: 'Apply 60%+ Reverb + HPF sweep on Track A during a vocal or pad section, fade out, and start Track B cleanly on Beat 1.',
    atmosphereEffect: 'Dreamy emotional decompression — ideal for -2 Whole Tone Energy Drops and cooling down after a peak.',
    accentColor: '#b46eff'
  },
  backspin: {
    title: 'Vinyl Backspin / Rewind Cut',
    shortTag: 'BACKSPIN',
    whatItIs: 'Spinning the platter backward rapidly to create an energetic rewind sweep before dropping the next song.',
    howToMix: 'On the final bar of the phrase, spin Track A’s jog wheel backward, cut its fader, and drop Track B on Beat 1.',
    atmosphereEffect: 'High-energy party hype signal for sudden genre or tempo switches.',
    accentColor: '#ffbe2e'
  },
  breakdown_blend: {
    title: 'Breakdown Swap (Kick-Less Section)',
    shortTag: 'BREAK SWAP',
    whatItIs: 'Aligns the entry of Song B specifically with the kick-less ambient breakdown (<POSITION_MARK>) of Song A.',
    howToMix: 'Bring in Track B during Track A’s beatless breakdown so the new rhythm or relative Major/Minor mode enters without kick-drum collision.',
    atmosphereEffect: 'Seamless genre pivot or emotional mode transformation (Minor ↔ Major) with zero drum clutter.',
    accentColor: '#b46eff'
  }
};
