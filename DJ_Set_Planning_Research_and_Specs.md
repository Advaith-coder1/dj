# DJ Set-Planning Web App: Living Product & Technical Specification

> **Status:** Architecture Approved & Ready for Build  
> **Last Updated:** 2026-11-07  
> **Architecture Decision:** Unified Next.js (TypeScript) + Tailwind CSS + Lucide Icons + Offline IndexedDB Storage

---

## 1. Project Overview & Vision
A web-based intelligent DJ set-planning assistant. Users can input their music via three flexible methods:
1. **A folder containing `.xml` files** (Pioneer Rekordbox collections/playlists)
2. **A folder containing `.m3u` / `.m3u8` files** (Traktor, Serato, VirtualDJ, iTunes)
3. **A raw text / CSV list of song titles and artists** (which automatically uses the **Spotify API** to query BPM, musical key, energy, and danceability)

The user customizes their set by specifying:
- **Set Duration / Length:** Target duration (e.g., 30m, 60m, 90m, 120m). Songs exceeding duration are preserved in an interactive **"Reserve / Unused Tracks"** bin for on-the-fly swaps.
- **Average Blend / Transition Window:** Estimated blend time per track (e.g., 3-minute average per song vs. full track lengths).
- **Macro Structure / Energy Curve:** The Ramp, The Wave (Rollercoaster), The Flatline (Lounge), Festival Smasher, or **PARTIES** (First 1/3 steady Ramp build followed by a 2/3 upward-trending Wave with peaks and troughs).

The web app computes the optimal sequence, provides an interactive review UI, and produces an **organized, downloadable output package / sorted folder** (`.xml`, `.m3u8`, printable Cue Sheet, and analysis report).

---

## 2. Confirmed Architectural Design & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js Fullstack Web Application                    │
│                                                                        │
│  [Frontend Layer - React + Tailwind + Radix UI + Lucide]               │
│  ├── Multi-Format Ingestion Dropzone (XML folder, M3U folder, Text)    │
│  ├── Set Configuration Controls (Duration Slider, Energy Curve Preset) │
│  ├── Visual Trajectory Dashboard (BPM ramp + Energy curve over time)   │
│  ├── Interactive Track Sequence Table (Drag & Drop, Clash Badges)      │
│  ├── "Reserve Tracks" Drawer (Unused library pool for manual swapping) │
│  └── Transition Memory Manager ("Save Transition", Notes, Stars)       │
│                                                                        │
│  [Client & Server Compute Engines]                                     │
│  ├── Parsers: fast-xml-parser (Rekordbox XML), regex m3u parser        │
│  ├── Musical Theory Core: Camelot wheel math, pitch-delta, phrasing    │
│  ├── Knapsack Filter: Fits library to target set duration              │
│  ├── TSP / Graph Solver: Beam search / Heuristic Hamiltonian path      │
│  ├── Spotify API Client: Auto token management with mock fallback      │
│  ├── Storage: Browser IndexedDB (Private, offline, zero-auth memory)   │
│  └── Exporter: JSZip packager generating XML, M3U8, and TXT Cue Sheet  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. In-Depth Musical Logic & DJ Theory Research

Synthesized from 7+ authoritative industry and academic sources (*Mixed In Key, Pioneer DJ / Rekordbox Specification, Digital DJ Tips, Crossfader, SirenMix, DJ.Studio, and Academic Graph/TSP Research for Music Information Retrieval*).

### 3.1 The Camelot Wheel & Harmonic Transition Taxonomy
Harmonic mixing prevents melodic and bass dissonance (key clashing) when layering two tracks. The Camelot system converts musical keys into an alphanumeric clock grid ($1-12$, where **A = Minor**, **B = Major**):

| Transition Type | Camelot Shift ($\Delta C$) | Musical Relation | Emotional / Energy Impact | Safe for Long Blends? | Transition Score ($0-10$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Exact Key Match** | $0$ (e.g., $8\text{A} \rightarrow 8\text{A}$) | Tonic unison | Identical mood; seamless continuation | **Yes (100%)** | **10 / 10** |
| **Adjacent Step** | $+1$ or $-1$ (e.g., $8\text{A} \rightarrow 9\text{A}$ / $7\text{A}$) | Perfect 5th / 4th ($7$ semitones) | $+1$ = Subtle lift; $-1$ = Deepening/mellowing mood | **Yes (95%)** | **9.5 / 10** |
| **Relative Major/Minor** | Mode swap ($8\text{A} \leftrightarrow 8\text{B}$) | Relative key (shares same notes) | Mood transformation: Sad/dark $\leftrightarrow$ Bright/euphoric | **Yes (90%)** | **9.0 / 10** |
| **Energy Boost (+2)** | $+2$ steps ($8\text{A} \rightarrow 10\text{A}$) | Whole tone modulation ($+2$ semitones) | Noticeable energy spike; exciting lift before drops | No (quick mix / drop mix / EQ swap) | **8.5 / 10** (Intentional boost) |
| **Energy Drop (-2)** | $-2$ steps ($10\text{A} \rightarrow 8\text{A}$) | Whole tone down ($-2$ semitones) | Controlled cooldown; resets floor after peak | No (quick mix / EQ cut) | **7.5 / 10** (Intentional drop) |
| **Aggressive Power Jump (+7)** | $+7$ steps ($8\text{A} \rightarrow 3\text{A}$ / semitone up) | Half-step pitch lift ($+1$ semitone) | Massive adrenaline surge; dramatic climax | No (hard drop mix or drum outro) | **8.0 / 10** (Sparingly used) |
| **Dramatic Energy Drain (-7)** | $-7$ steps ($3\text{A} \rightarrow 8\text{A}$ / semitone down) | Half-step down ($-1$ semitone) | Instant tension drain; dark, heavy reset | No (cut / wash out) | **6.5 / 10** |
| **Harmonic Clash** | $\ge 3$ steps (non-boosted) | Dissonant scale overlap | Jarring dissonance, melodic conflict | **Unsafe** (requires echo-out, cut, or percussion-only transition) | **2.0 / 10** (Flagged with warning) |

### 3.2 BPM Progression & Pitch Mechanics
1. **Pitch Slider Precision Ranges:**
   * $\pm 6\%$ to $\pm 8\%$: Standard for House, Techno, Trance. Maximum physical throw on faders, minimum audible pitch distortion.
   * $\pm 16\%$: Acceptable for bridging moderate tempo transitions.
   * $\pm 50\%$ / $\text{WIDE}$: Reserved for open-format or double/half-time leaps.
2. **Acceptable BPM Deltas ($\Delta\text{BPM}$):**
   * **Smooth Transition Threshold:** $\le 2-3\text{ BPM}$ (can be adjusted during the blend without noticeable pitch artifacts).
   * **Stretch Limit:** $\le 5-8\text{ BPM}$ (requires gradual pitch ramping over multiple tracks or during breakdowns).
   * **Harmonic Tempo Multipliers (Half-Time / Double-Time):**
     $$\text{BPM}_{\text{eff}} \in \{\text{BPM}, 2 \times \text{BPM}, 0.5 \times \text{BPM}\}$$
     Example: $70\text{ BPM}$ (Hip-hop/Dub) transitions cleanly into $140\text{ BPM}$ (Dubstep/Techno), or $87\text{ BPM} \leftrightarrow 174\text{ BPM}$ (Drum & Bass).

### 3.3 Phrasing & Structural Transitions
Professional DJ theory relies on the **Rule of 32** (4/4 time signature):
* $1\text{ Bar} = 4\text{ Beats}$.
* $1\text{ Standard Phrase} = 8\text{ Bars} = 32\text{ Beats}$.
* Tracks evolve on $32$-beat multiples ($32$, $64$, $96$ beats).

---

## 4. Comprehensive DJ Transition Taxonomy & Dancefloor Psychology

| Transition Type | Technical Execution | Energy Shift | Dancefloor Psychology & Atmospheric Effect | Best Situations / Genres |
| :--- | :--- | :--- | :--- | :--- |
| **The Long Blend (Progression Blend)** | Overlapping both tracks for 16–64 bars; delicate 3-band EQ frequency carving (bass swap on phrase downbeats). | **Neutral to Steady Rise** (Hypnotic, seamless momentum) | **Subconscious Hypnosis & Flow State:** Prevents cognitive reset. The brain never registers a boundary; time dissolves as the groove evolves continuously. | Deep House, Minimal Techno, Melodic Techno, Progressive House, Trance. |
| **The Drop Mix (Bass Swap / Drop Hit)** | Matching build-up tension; cutting Track A bass precisely on Beat 1 of a new 32-beat phrase while slamming Track B's bass/drop. | **Instant Sharp Surge (+20% to +40% Energy)** | **Euphoric Release & Dopamine Rush:** Exploits the classic tension-and-release cycle. Gives dancers an instant reward, preventing set stagnation. | EDM, Mainstage, Tech House, Bass House, Drum & Bass. |
| **The Cold Drop / Hard Cut** | Abruptly cutting Track A to zero volume and slamming Track B directly on the 1st beat of the chorus/verse or vocal cue. | **Shockwave / High Energy Shift** | **Disruption & Reset:** Slaps the crowd out of autopilot. Demands immediate focus; feels like a cinematic plot twist when unexpected. | Hip-Hop, Open Format, Trap, Funk/Disco, sudden genre pivots. |
| **The Echo Out (Delay Tail)** | Activating a 1/2 or 3/4 beat delay on Track A, pulling down the channel fader, and letting the echoes decay over silence or Track B's intro. | **Decompression $\rightarrow$ Reset** (Controlled dissipation) | **Atmospheric Breathing Room:** Decompresses auditory fatigue after a massive peak. Cleanses the mental palate without awkward abruptness. | Peak-to-break transitions, bridging incompatible tempos/keys, genre jumps. |
| **The Reverb Wash (Ambient Washout)** | Sending Track A into a 100% wet reverb tail with low-cut filter, dissolving the track into a spacious cloud. | **Ethereal / Dreamy Float** | **Floating Disorientation:** Strips percussive drive to leave listeners suspended in zero gravity before snapping back to a solid rhythm. | Ambient, Melodic House, Chillout, Breakdown transitions. |
| **The Filter Sweep (HPF / LPF Fade)** | Sweeping High-Pass Filter (HPF) on Track A to eliminate lows/mids, while gradually lowering the sweep on Track B. | **Smooth Build / Tension Squeeze** | **Rising Suspense:** Thinning out sound makes the crowd lean forward, anticipating the physical return of sub-bass frequencies. | Club transitions, vocal-over-beat mixing, tech house grooves. |
| **The Backspin (Rewind / Spinback)** | Physically spinning the platter backward fast on beat 4, creating an abrasive vinyl rewind sweep before dropping Track B. | **Peak Adrenaline / Rowdy Spike** | **High-Octane Party Hype:** Universal club signal that something huge is arriving. Commands cheers and maximum crowd engagement. | Grime, UK Bass, Hip-Hop, Dancehall, Dubstep. |
| **The Breakdown-to-Intro Blend** | Starting Track B’s melodic intro inside Track A’s breakdown, merging pads and chords into a combined climax. | **Deep Emotional Peak** | **Chills & Musical Elevation:** Two tracks blend into a live remix. Multiplies emotional intensity before dropping together. | Trance, Melodic Techno, Deep/Afro House. |

---

## 5. Adaptive Learning System: The Transition Memory Knowledge Base

### 5.1 Storage & Integration
* Stored in browser `IndexedDB` with exportable `transitions_memory.json`.
* Cost function with learned memory weight $w_M$:
  $$\text{Cost}(T_i \rightarrow T_j) = w_H \cdot C_H + w_B \cdot C_B + w_E \cdot C_E - w_M \cdot M(T_i, T_j)$$

---

## 6. Output Package Specification

```
Sorted_DJ_Set_<Timestamp>/
├── 01_Rekordbox_Import.xml        # Numbered playlist ready for Pioneer CDJs/Rekordbox
├── 02_Universal_Playlist.m3u8     # Numbered playlist compatible with Serato/Traktor/VLC
├── 03_DJ_Cue_Sheet.txt            # Formatted text cue sheet for the DJ booth
├── 04_Set_Analysis_Report.json    # Full trajectory data (BPM, Energy, Camelot)
└── 05_Saved_Transitions.json      # Exported memory knowledge base
```

---

## 7. Performance Mode: Auto-Track Detection & Color-Coded Transition HUD

### 7.1 Option 1 (WebMIDI Controller Sync) vs. Option 2 (Rekordbox DB/File Watcher)

| Feature | Option 1: WebMIDI Controller Listener (`MIDI`) | Option 2: Rekordbox History/DB Watcher (`RB-DB`) |
| :--- | :--- | :--- |
| **How it works** | Browser listens directly to USB DJ Controller MIDI signals (crossfader, channel upfaders, Play pads) via `navigator.requestMIDIAccess()`. | Next.js local API (`/api/rekordbox/status`) monitors `~/Library/Pioneer/rekordbox` state/history files on macOS. |
| **Pros** | • **Zero latency** (reacts the exact millisecond you slam a fader or press Play).<br>• Works even while Rekordbox is focused full-screen.<br>• No database encryption barriers. | • **No hardware controller required** (works when mixing internal 2-deck mode on laptop keyboard/trackpad).<br>• Reflects Rekordbox's internal play history state. |
| **Cons** | • Requires a USB MIDI controller plugged in.<br>• Requires Chrome/Edge/Brave (Safari does not natively support WebMIDI). | • **30–60 second delay**: Rekordbox only writes a track to History after it plays for ~30–60s.<br>• Rekordbox 6/7 encrypts `master.db` with SQLCipher. |

### 7.2 Color-Coded Transition Notification System (WHEN + HOW)
To keep the corner window ultra-minimal while giving instant visual cues in a dark DJ booth:

1. **WHEN to Transition (Left Banner, Clickable Time Unit Toggle, & Progress Bar Color)**:
   - Clicking the time badge cycles the unit between **Seconds** (`MIX IN 142s`), **Minutes** (`MIX IN 02:22`), and **4/4 Musical Bars** (`MIX IN 72 BARS`, computed dynamically from the active track's BPM).
   - 🔵 **Blue (`MIX IN ...`)**: Track is cruising in main body; counts down to when the mix phrase starts.
   - 🟡 **Amber (`CUE IN ...`)**: 30 seconds before the mix point — alerts the DJ to load and beatmatch the incoming track.
   - 🟢 **Flashing Neon Green (`▶ MIX NOW (...)`)**: Inside the exact phrase window (`OUTRO 64B`, `ON DROP 1`, `BREAK 32B`), counting down the remaining mix window.
2. **HOW to Transition (Right 2-Word Color Pill)**:
   - 🟢 **Green (`64B BLEND`)**: Safe harmonic match — long 64-beat EQ blend.
   - 🟡 **Amber (`⚡ DROP MIX`)**: $+2$ / $+7$ Energy Boost — slam on Beat 1 of the drop.
   - 🟣 **Purple (`MODE SWAP` / `WASH OUT`)**: Breakdown blend or reverb tail transition.
   - 🔵 **Cyan (`HARD CUT`)**: Half-time / double-time instant beat cut.
   - 🔴 **Red (`ECHO CUT` / `FILTER CUT`)**: Harmonic clash warning — use delay tail or high-pass filter cut.
3. **One-Click `MATCH` Button (Apple Vision OCR Screen Realignment)**:
   - Located directly beside the Play/Pause button on the Now Playing deck strip.
   - Triggers `/api/rekordbox/match`, which captures the main Rekordbox display via macOS `screencapture` and runs a compiled native Apple Vision OCR binary (`scripts/ocr_helper`) to read the active deck's track title and digital clock (`MM:SS` or `-MM:SS`), snapping both the active song and the progress bar to Rekordbox's exact playback position.

---

## 8. Phased Implementation Roadmap

- [x] **Phase 1: Project Setup & Ingestion Engine**
  - Next.js application scaffold with Tailwind CSS, Lucide icons, and state store.
  - Rekordbox XML folder parser (`fast-xml-parser`) extracting `Name`, `Artist`, `AverageBpm`, `Tonality`, `TotalTime`, **`Genre`**, **`Label`**, **`Remixer`**, **`Mix`**, **`Comments`**, and **`Colour`** (hex energy override, excluding `Year` per user directive), plus **`<TEMPO>`** (`Inizio`, `Bpm`, `Metro`, `Battito`) and **`<POSITION_MARK>`** structural phrase markers (`Intro`, `Outro`, `Breakdown`, `Vocal`, `Instrumental` converted to exact beat counts).
  - M3U/M3U8 folder parser.
  - Plain song text / CSV parser + Spotify API client extracting `instrumentalness`, `speechiness`, `valence`, and `danceability`.
- [x] **Phase 2: Musical Intelligence Core (Upgraded via *Algorithmic Sequencing & Transition Optimization for Automated DJ Systems*)**
  - **Expanded Camelot Modulation Matrix & Tonal Interval Space (TIS) (`camelot.ts`)**: Scores Perfect Match (`10.0`), Adjacent (`9.5`), Relative Shift (`9.0`), Energy Boost `+2` (`8.5`), Diagonal Major `+1 B->A` (`8.5`), Diagonal Minor `-1 A->B` (`8.5`), Semitone Boost `+7` (`8.0`), Energy Drop `-2` (`7.5`), and Mood Switch `+4` ("David Guetta Technique", `7.0`). Enforces the TIS hard rule forbidding blends when score `< 7.0` and overriding `+2`/`+7` boosts to `DROP MIX` or `SHORT BLEND (16B)`.
  - **Pitch & Tempo Interdependence (`transitionScorer.ts`)**: Evaluates BPM deltas via percentage pitch shift ($\frac{|\Delta \text{BPM}|}{\text{BPM}_A} \times 100\%$), heavily penalizing shifts $> 4\%$ (which approach a full semitone without Keylock).
  - **Directed Genre Compatibility Graph & Genre Pivot Override (`genreGraph.ts`)**: Distance 0 (`10.0/10` exact genre or same `Label`), Distance 1 (`8.5/10` bridge sub-genre), Distance 2 (`5.0/10` rhythmic shift pivot), Distance 3 (`2.0/10` severe clash). Automatically forbids `64B BLEND` when `graphDistance >= 2`, switching to `ECHO CUT`, `BREAKDOWN SWAP`, or `HARD CUT ON BEAT 1`.
  - **Vocal Avoidance Rule & AI Stem Separation (`transitionScorer.ts`)**: Flags vocal clashes when `(instrumentalness < 0.5 || speechiness > 0.33)` on both tracks without `"Instrumental"` `<POSITION_MARK>` tags, outputting `STEM_BLEND_64B` (`MUTE(TrackB.VocalStem) FROM Beat 1 TO Beat 64 | SWAP(TrackA.BassStem, TrackB.BassStem) AT Beat 33`) or overriding to `DROP MIX` / `ECHO CUT`.
  - **Frequency-Domain EQ Automation, Crossfader Curve Geometry & EBU R128 Gain Staging**: Generates Subtractive EQ / Bar 9 (Beat 33) Phrase Bass Swap instructions, HPF 20Hz$\rightarrow$280Hz sweeps, `Constant Power` vs. `Sharp Cut` crossfader curves, and `-14.0 LUFS / -1.0 dBTP` True Peak normalization directives.
  - **7 Macro-Level Energy Curves (`SetControls.tsx` & `tspOptimizer.ts`)**: `The Ramp`, `The Wave`, `Lounge / Warm-Up`, `Festival Smasher`, `PARTIES`, `The Journey (Bell Curve)`, and `The Cool-Down`.
  - **6-Term Multi-Objective Cost Function & Moving-Window Fatigue Penalties (`tspOptimizer.ts`)**: Minimizes $C(i, j, t) = \alpha H(i, j) + \beta T(i, j) + \gamma E(j, t) + \delta V(i, j) + \epsilon G(i, j) + \zeta M(j, t)$ using Beam Search ($K=25$) + 1-step lookahead + 2-Opt refinement, enforcing **Artist Fatigue Penalty** (last 3 tracks), **Key Monotony Penalty** ($\ge 3$ consecutive tracks in same key), **Valence Delta Penalty** ($w_v |A_{\text{valence}} - B_{\text{valence}}|$), and **The 4-on-the-Floor Reset**.
- [x] **Phase 3: Transition Memory Engine**
  - IndexedDB storage for verified song pairings.
  - Memory bonus integration in TSP solver.
  - "Save Transition" dialog and manual re-order tracking.
- [x] **Phase 4: Modern Web Interface & Rekordbox Performance Mode**
  - Drag-and-drop ingestion zone (Folder & File support).
  - Set settings drawer (Duration slider, curve selector with interactive SVG hover preview popovers).
  - Interactive trajectory chart (BPM & Energy curves).
  - Drag-and-drop track table with Reserve Pool drawer.
  - **Performance Mode (`PerformanceModeView.tsx`) & Always-On-Top Full-Screen HUD (`scripts/hud_window.swift` + `/api/rekordbox/hud`)**: Ultra-compact Rekordbox-matched color scheme (`#161616` / `#1e1e1e` matte dark grey, `#00a2ff` Rekordbox blue, `#00d084` traffic-light green keys, sharp `2px` utility borders) with `NOW` / `NEXT` deck HUD, keyboard navigation (`↑`/`↓`), and a native macOS `NSPanel` (`NSApplication.ActivationPolicy.accessory` + `.nonactivatingPanel` + `.canJoinAllSpaces` + `.fullScreenAuxiliary` + `level = .statusBar`) that floats in the corner of the screen even when Rekordbox is running in macOS Full-Screen mode.
- [x] **Phase 5: Output Packaging & Testing**
  - User-selectable destination folder export (`/api/export/save-folder` via native macOS Finder `choose folder` dialog + browser `showDirectoryPicker` / `showSaveFilePicker` fallback) writing an unpacked `Sorted_DJ_Set_<duration>min` directory containing `01_Rekordbox_Import.xml`, `02_Universal_Playlist.m3u8`, `03_DJ_Cue_Sheet.txt`, and `04_Set_Analysis_Report.json`.
  - E2E testing with sample Rekordbox files and playlists.
