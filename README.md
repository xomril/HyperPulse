<div align="center">

  <h1>⚡ HYPERPULSE AUDIO ENGINE</h1>
  <p><strong>Next-Gen Web Audio Player & Real-Time Reactive Visualizer Engine</strong></p>

  <p>
    <img src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JS">
    <img src="https://img.shields.io/badge/Web%20Audio-API-00F0FF?style=for-the-badge&logo=html5&logoColor=white" alt="Web Audio">
    <img src="https://img.shields.io/badge/HTML5-Canvas%202D-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="Canvas 2D">
    <img src="https://img.shields.io/badge/Styling-Cyber%20Glassmorphism-FF007F?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
    <img src="https://img.shields.io/badge/Build-Vanilla%20%2F%20No%20Dependencies-00FFAA?style=for-the-badge" alt="Vanilla">
  </p>

  <p><i>A sleek, high-performance, modular audio deck built with pure Vanilla Web technologies.</i></p>

  ---
</div>

## 🌐 Overview

**HyperPulse** is a cutting-edge web audio engine and reactive sound visualizer. Designed with a **Cyber-Glassmorphism** visual identity, it pairs modular draggable windows with an advanced Web Audio DSP graph, multi-mode frequency spectrum analyzers, background particle systems, timestamp cue point management, and synchronized YouTube video playback.

---

## 🌟 Key Capabilities

<details open>
<summary><b>🎛️ Advanced Web Audio DSP & Equalizer</b></summary>
<br>

- **10-Band Equalizer**: High-precision peaking filters spanning 32Hz to 16kHz with live pre-amplification gain control.
- **Factory EQ Presets**: Instant one-click tuning for *Flat*, *Rock*, *Pop*, *Techno*, *Classical*, *Jazz*, *Vocal Booster*, and *Bass Booster*.
- **Master Spatial Panning & Speed**: Full L/R stereo panning balance and smooth variable playback rate adjustment ($0.5\times$ to $2.0\times$).
</details>

<details open>
<summary><b>📊 Multi-Mode Real-Time Visualizers</b></summary>
<br>

| Mode | Visualizer Type | Description |
| :---: | :--- | :--- |
| **`SPEC`** | **Spectrum Analyzer** | 16-bar real-time FFT frequency bars with gravitational peak-hold indicators. |
| **`WAVE`** | **Oscilloscope** | Live time-domain audio waveform oscilloscope trace. |
| **`HEAT`** | **Spectrogram** | Multi-colored spectrogram heatmap scrolling with frequency distribution. |
| **`VORTEX`** | **Polar Vector Spectrum** | 360° circular vector spectrum pulsating to audio beats. |
</details>

<details open>
<summary><b>🌌 Interactive Ambient Background Particle Engines</b></summary>
<br>

- **`NEBULA`**: Deep-space cosmic particle cloud with bass-reactive float physics.
- **`CYBER GRID`**: 3D Synthwave perspective grid with animated horizon frequency spectrum bars.
- **`SOUND RINGS`**: Expanding concentric shockwave rings triggered by audio transients.
- **`STARFIELD`**: 3D starfield hyperdrive accelerating on audio beat spikes.
- **`VORTEX`**: 6-arm plasma particle vortex swirling dynamically with audio amplitude.
</details>

<details open>
<summary><b>🔖 Timemark Cue Points System</b></summary>
<br>

- Bookmark unlimited precise timestamp cue points on any track.
- Visual cue markers dynamically mapped directly onto the interactive seek bar.
- Edit cue labels inline, jump instantly to timestamps, and persist state automatically via `LocalStorage`.
</details>

<details open>
<summary><b>🔄 Synced Dual Playback Engine</b></summary>
<br>

- Dedicated sync view (`dual-play.html`) streaming local audio in lockstep with YouTube video playback.
- Integrated 500ms auto-drift detection and correction algorithm ensuring zero video-audio desync.
</details>

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :---: | :--- |
| <kbd>Space</kbd> | Global | **Play / Pause** toggle |
| <kbd>Space</kbd> <kbd>Space</kbd> *(Fast Double-Press)* | Global | **Restart track** from beginning (`00:00`) |
| `party` | Secret | Toggle **Party Rave Mode** (RGB Strobe + Bouncing Sliders) |

> ℹ️ *Shortcut listener automatically suspends when typing inside input boxes or editable text regions.*

---

## 📁 Repository Architecture

```
HyperPulse/
├── 📄 index.html                  # Main HyperPulse Audio Engine interface & window dock
├── 🎨 style.css                   # Cyber-Glassmorphism design system & token definitions
├── ⚡ app.js                      # Web Audio graph, playback state, drag/snap & shortcuts
├── 📊 visualizer.js               # Canvas 2D spectrum visualizers & background particle engines
├── 🔄 dual-play.html              # YouTube + MP3 dual synced playback viewport
├── ⚙️ dual-play.js                # YouTube IFrame API integration & drift auto-sync loop
├── 🎵 where_is_my_husband.mp3     # Default audio demonstration track
└── 📘 README.md                   # Project documentation
```

---

## ⚡ Quick Start

### 1. Direct Browser Launch
Simply double-click [`index.html`](file:///Users/omri/workspace/landing%20page/index.html) or open it directly in any modern browser (Chrome, Safari, Firefox, Edge).

### 2. Local HTTP Server
Run a local development server with Python:

```bash
python3 -m http.server 8087
```

Navigate to **`http://localhost:8087`** in your browser.

---

<div align="center">
  <sub>Crafted with ❤️ using Vanilla HTML5, CSS3 & Web Audio API</sub>
</div>
