/**
 * Winamp Web Player - Visualizer Module
 * Handles canvas-based rendering of audio frequencies and waveforms.
 */

class WinampVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = null;
    this.mode = 'spectrum'; // 'spectrum' | 'oscilloscope' | 'spectrogram'
    this.animationId = null;
    this.isPlaying = false;
    
    // Peak fall data for Winamp-like peak indicators
    this.peaks = [];
    this.peakHoldFrames = [];
    this.peakFallSpeed = 0.5;

    // Heatmap buffer for spectrogram
    this.spectrogramBuffer = null;
    this.spectrogramCtx = null;
  }

  setAnalyser(analyser) {
    this.analyser = analyser;
    this.setupMode();
  }

  setMode(mode) {
    this.mode = mode;
    this.setupMode();
  }

  setupMode() {
    if (!this.analyser) return;

    if (this.mode === 'spectrum') {
      this.analyser.fftSize = 128; // 64 frequency bins
      this.analyser.smoothingTimeConstant = 0.75;
      const bufferLength = this.analyser.frequencyBinCount;
      this.peaks = new Array(bufferLength).fill(0);
      this.peakHoldFrames = new Array(bufferLength).fill(0);
    } else if (this.mode === 'oscilloscope') {
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
    } else if (this.mode === 'spectrogram' || this.mode === 'vortex') {
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      
      // Initialize offscreen canvas for scrolling spectrogram
      if (!this.spectrogramBuffer) {
        this.spectrogramBuffer = document.createElement('canvas');
        this.spectrogramBuffer.width = this.canvas.width;
        this.spectrogramBuffer.height = this.canvas.height;
        this.spectrogramCtx = this.spectrogramBuffer.getContext('2d');
        this.spectrogramCtx.fillStyle = '#020205';
        this.spectrogramCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.draw();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
  }

  clearCanvas() {
    this.ctx.fillStyle = '#020205';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw() {
    if (!this.isPlaying) return;
    this.animationId = requestAnimationFrame(() => this.draw());

    if (!this.analyser) {
      this.clearCanvas();
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;

    if (this.mode === 'spectrum') {
      this.drawSpectrum(width, height);
    } else if (this.mode === 'oscilloscope') {
      this.drawOscilloscope(width, height);
    } else if (this.mode === 'spectrogram') {
      this.drawSpectrogram(width, height);
    } else if (this.mode === 'vortex') {
      this.drawVortexVector(width, height);
    }
  }

  drawVortexVector(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    this.clearCanvas();

    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(width, height) * 0.22;

    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.shadowColor = '#38bdf8';
    this.ctx.shadowBlur = 6;

    this.ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i] / 255;
      const angle = (i / bufferLength) * Math.PI * 2;
      const currentR = baseR + val * (height * 0.38);

      const x = cx + Math.cos(angle) * currentR;
      const y = cy + Math.sin(angle) * currentR;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();

    // Pulsing center dot
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  drawSpectrum(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    this.clearCanvas();

    const barWidth = Math.ceil(width / bufferLength);
    const spacing = 1;
    const drawWidth = barWidth - spacing;

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      // Normalize percent height
      const percent = value / 255;
      const barHeight = percent * height;

      // Draw frequency bar
      const x = i * barWidth;
      const y = height - barHeight;

      // Beautiful gradient color: neon cyan to neon blue to violet
      const grad = this.ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#1d4ed8'); // blue
      grad.addColorStop(0.5, '#38bdf8'); // cyan
      grad.addColorStop(1, '#a855f7'); // purple

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, y, drawWidth, barHeight);

      // Winamp falling peaks logic
      if (barHeight > this.peaks[i]) {
        this.peaks[i] = barHeight;
        this.peakHoldFrames[i] = 15; // Hold for 15 frames before falling
      } else {
        if (this.peakHoldFrames[i] > 0) {
          this.peakHoldFrames[i]--;
        } else {
          this.peaks[i] -= this.peakFallSpeed;
          if (this.peaks[i] < 0) this.peaks[i] = 0;
        }
      }

      // Draw peak indicator dot (neon pink)
      const peakY = height - this.peaks[i];
      if (peakY < height) {
        this.ctx.fillStyle = '#f43f5e';
        this.ctx.fillRect(x, Math.max(0, peakY - 1), drawWidth, 1);
      }
    }
  }

  drawOscilloscope(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    this.clearCanvas();

    // Draw grid lines (subtle CRT feel)
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw waveform
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#4ade80'; // Neon green
    this.ctx.shadowColor = '#4ade80';
    this.ctx.shadowBlur = 4;
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
    
    // Reset shadow values for next draws
    this.ctx.shadowBlur = 0;
  }

  drawSpectrogram(width, height) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Scroll the spectrogram buffer to the left
    this.spectrogramCtx.drawImage(this.spectrogramBuffer, -1, 0);

    // Draw the new column on the far right
    const colX = width - 1;
    const pixelHeight = height / bufferLength;

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const percent = value / 255;
      
      // Map amplitude to heatmap colors (Dark purple -> Red/Pink -> Orange -> Yellow)
      let color;
      if (percent < 0.1) {
        color = `rgb(${Math.floor(percent * 10 * 30)}, 0, ${Math.floor(percent * 10 * 60)})`;
      } else if (percent < 0.5) {
        const factor = (percent - 0.1) / 0.4;
        color = `rgb(${Math.floor(30 + factor * 200)}, 0, ${Math.floor(60 - factor * 30)})`;
      } else if (percent < 0.8) {
        const factor = (percent - 0.5) / 0.3;
        color = `rgb(230, ${Math.floor(factor * 150)}, ${Math.floor(30 - factor * 30)})`;
      } else {
        const factor = (percent - 0.8) / 0.2;
        color = `rgb(230, ${Math.floor(150 + factor * 105)}, ${Math.floor(factor * 200)})`;
      }

      this.spectrogramCtx.fillStyle = color;
      this.spectrogramCtx.fillRect(colX, height - (i * pixelHeight), 1, pixelHeight);
    }

    // Render the offscreen buffer on the screen canvas
    this.ctx.drawImage(this.spectrogramBuffer, 0, 0);
  }
}

/**
 * Full-screen Background Audio Visualizer & Effects System
 * Renders audio-reactive particles, grids, rings, and starfield visuals behind player.
 */
class BackgroundVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = null;
    this.mode = 'nebula'; // 'nebula' | 'grid' | 'rings' | 'warp'
    this.isPlaying = false;
    this.isEnabled = true;
    this.animationId = null;

    // Smoother audio energy metrics
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.smoothedBass = 0;
    this.beatPulse = 0;

    // Resize canvas to full window size
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Particles for nebula mode
    this.initParticles();
    // Starfield for warp mode
    this.initStars();
    // Vortex particles for vortex mode
    this.initVortexParticles();
    // Ripples for rings mode
    this.ripples = [];
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initParticles();
    this.initStars();
    this.initVortexParticles();
  }

  initVortexParticles() {
    const count = 180;
    this.vortexParticles = [];
    const arms = 6;
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const dist = Math.random();
      const angle = (arm / arms) * Math.PI * 2 + dist * Math.PI * 2.5;
      this.vortexParticles.push({
        arm: arm,
        dist: dist,
        angle: angle,
        baseSpeed: 0.002 + Math.random() * 0.004,
        size: Math.random() * 3 + 1,
        hue: (arm * 60 + Math.random() * 30) % 360,
        sparkle: Math.random() < 0.2
      });
    }
    this.vortexAngle = 0;
    this.burstParticles = [];
  }

  initParticles() {
    const count = 75;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3.5 + 1.5,
        baseRadius: Math.random() * 3.5 + 1.5,
        hue: Math.random() * 60 + 190, // Cyan to Purple
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  initStars() {
    const count = 150;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * this.canvas.width,
        y: (Math.random() - 0.5) * this.canvas.height,
        z: Math.random() * this.canvas.width,
        pz: 0
      });
    }
  }

  setAnalyser(analyser) {
    this.analyser = analyser;
  }

  setMode(mode) {
    this.mode = mode;
  }

  toggleEnabled(force) {
    this.isEnabled = force !== undefined ? force : !this.isEnabled;
    if (!this.isEnabled) {
      this.clearCanvas();
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.draw();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  analyzeAudio() {
    if (!this.analyser) {
      this.bass = 0;
      this.mid = 0;
      this.treble = 0;
      this.beatPulse *= 0.9;
      return null;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate energy bands
    let bassSum = 0;
    const bassBins = Math.max(1, Math.floor(bufferLength * 0.12));
    for (let i = 0; i < bassBins; i++) {
      bassSum += dataArray[i];
    }
    const rawBass = bassSum / (bassBins * 255);

    let midSum = 0;
    const midBins = Math.max(1, Math.floor(bufferLength * 0.45));
    for (let i = bassBins; i < bassBins + midBins; i++) {
      midSum += dataArray[i];
    }
    const rawMid = midSum / (midBins * 255);

    let trebleSum = 0;
    const trebleCount = bufferLength - (bassBins + midBins);
    for (let i = bassBins + midBins; i < bufferLength; i++) {
      trebleSum += dataArray[i];
    }
    const rawTreble = trebleCount > 0 ? trebleSum / (trebleCount * 255) : 0;

    // Smooth audio data
    this.bass += (rawBass - this.bass) * 0.25;
    this.mid += (rawMid - this.mid) * 0.2;
    this.treble += (rawTreble - this.treble) * 0.2;

    // Beat pulse detection logic
    this.smoothedBass += (this.bass - this.smoothedBass) * 0.05;
    if (this.bass > this.smoothedBass + 0.12 && this.beatPulse < 0.3) {
      this.beatPulse = 1.0; // Trigger beat pulse explosion
      
      // Trigger window beat pulse effect if callback registered
      if (typeof this.onBeat === 'function') {
        this.onBeat(this.beatPulse);
      }

      // If in rings mode, emit new ring on beat
      if (this.mode === 'rings') {
        this.ripples.push({
          radius: 10,
          maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.6,
          alpha: 0.8,
          color: `hsl(${200 + Math.random() * 100}, 90%, 60%)`
        });
      }
    } else {
      this.beatPulse *= 0.91; // Fast decay
    }

    return dataArray;
  }

  draw() {
    if (!this.isPlaying) return;
    this.animationId = requestAnimationFrame(() => this.draw());

    if (!this.isEnabled) {
      this.clearCanvas();
      return;
    }

    const dataArray = this.analyzeAudio();
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear with transparent fade for trail effects
    this.ctx.fillStyle = 'rgba(12, 15, 29, 0.25)';
    this.ctx.fillRect(0, 0, width, height);

    if (this.mode === 'nebula') {
      this.drawNebula(width, height);
    } else if (this.mode === 'grid') {
      this.drawGrid(width, height, dataArray);
    } else if (this.mode === 'rings') {
      this.drawRings(width, height);
    } else if (this.mode === 'warp') {
      this.drawWarp(width, height);
    } else if (this.mode === 'vortex') {
      this.drawVortex(width, height, dataArray);
    }
  }

  drawNebula(width, height) {
    const cx = width / 2;
    const cy = height / 2;

    // Dynamic background aura glow around player center
    const glowRadius = Math.min(width, height) * (0.35 + this.bass * 0.25 + this.beatPulse * 0.1);
    const grad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
    grad.addColorStop(0, `rgba(56, 189, 248, ${0.12 + this.bass * 0.25})`);
    grad.addColorStop(0.5, `rgba(168, 85, 247, ${0.08 + this.mid * 0.18})`);
    grad.addColorStop(1, 'rgba(12, 15, 29, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);

    // Render & update floating dust particles
    const speedMult = 1 + this.bass * 3 + this.beatPulse * 2;
    for (const p of this.particles) {
      p.x += p.vx * speedMult;
      p.y += p.vy * speedMult;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const r = p.baseRadius * (1 + this.bass * 1.5 + this.beatPulse * 0.8);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue + this.treble * 60}, 85%, 65%, ${p.alpha * (0.6 + this.bass * 0.4)})`;
      this.ctx.shadowBlur = 8 + this.beatPulse * 15;
      this.ctx.shadowColor = `hsl(${p.hue}, 90%, 60%)`;
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
  }

  drawGrid(width, height, dataArray) {
    const cx = width / 2;
    const horizon = height * 0.65;

    // Horizon glowing background
    const grad = this.ctx.createLinearGradient(0, horizon - 100, 0, height);
    grad.addColorStop(0, 'rgba(12, 15, 29, 0)');
    grad.addColorStop(0.4, `rgba(244, 63, 94, ${0.05 + this.bass * 0.15})`);
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, horizon - 100, width, height - (horizon - 100));

    // 3D Perspective Grid
    this.ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 + this.bass * 0.25})`;
    this.ctx.lineWidth = 1 + this.beatPulse * 1.5;

    // Perspective lines emanating from horizon center
    const perspectiveLineCount = 18;
    for (let i = -perspectiveLineCount; i <= perspectiveLineCount; i++) {
      const xTop = cx + i * (width / (perspectiveLineCount * 2));
      const xBottom = cx + i * (width / perspectiveLineCount) * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(xTop, horizon);
      this.ctx.lineTo(xBottom, height);
      this.ctx.stroke();
    }

    // Horizontal moving grid lines
    const time = Date.now() * 0.001 * (1 + this.bass * 2);
    const lineCount = 12;
    for (let i = 0; i < lineCount; i++) {
      const progress = ((i / lineCount) + (time % 1)) % 1;
      const y = horizon + Math.pow(progress, 2) * (height - horizon);
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Audio Frequency Horizon Bars
    if (dataArray) {
      const binStep = Math.floor(dataArray.length / 32);
      const barWidth = width / 32;
      for (let i = 0; i < 32; i++) {
        const val = dataArray[i * binStep] / 255;
        const barH = val * (height * 0.25);
        const x = i * barWidth;
        const y = horizon - barH;

        const barGrad = this.ctx.createLinearGradient(0, horizon, 0, y);
        barGrad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
        barGrad.addColorStop(1, `rgba(244, 63, 94, ${0.4 + val * 0.6})`);

        this.ctx.fillStyle = barGrad;
        this.ctx.fillRect(x, y, barWidth - 2, barH);
      }
    }
  }

  drawRings(width, height) {
    const cx = width / 2;
    const cy = height / 2;

    // Core synth pulsing aura
    const coreRadius = 50 + this.bass * 120 + this.beatPulse * 40;
    const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    grad.addColorStop(0, `rgba(74, 222, 128, ${0.3 + this.beatPulse * 0.4})`);
    grad.addColorStop(0.5, `rgba(56, 189, 248, ${0.15 + this.bass * 0.2})`);
    grad.addColorStop(1, 'rgba(12, 15, 29, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Render expanding audio ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 4 + this.bass * 8;
      r.alpha -= 0.008;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.strokeStyle = r.color;
      this.ctx.globalAlpha = r.alpha;
      this.ctx.lineWidth = 2 + this.beatPulse * 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;
    }
  }

  drawWarp(width, height) {
    const cx = width / 2;
    const cy = height / 2;

    const speed = 4 + this.bass * 30 + this.beatPulse * 25;

    for (const star of this.stars) {
      star.pz = star.z;
      star.z -= speed;

      if (star.z <= 0) {
        star.z = width;
        star.pz = star.z;
        star.x = (Math.random() - 0.5) * width;
        star.y = (Math.random() - 0.5) * height;
      }

      const k = 256 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      const pk = 256 / star.pz;
      const ppx = star.x * pk + cx;
      const ppy = star.y * pk + cy;

      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        const size = (1 - star.z / width) * 3 + 0.5;
        this.ctx.strokeStyle = `hsl(${190 + (1 - star.z / width) * 100}, 90%, 75%)`;
        this.ctx.lineWidth = size;
        this.ctx.beginPath();
        this.ctx.moveTo(ppx, ppy);
        this.ctx.lineTo(px, py);
        this.ctx.stroke();
      }
    }
  }

  drawVortex(width, height, dataArray) {
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) * 0.55;

    // 1. Central Core Plasma Energy Field
    const coreGlow = 40 + this.bass * 140 + this.beatPulse * 60;
    const coreGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreGlow);
    const hueShift = (Date.now() * 0.05) % 360;
    coreGrad.addColorStop(0, `hsla(${hueShift}, 100%, 70%, ${0.6 + this.beatPulse * 0.4})`);
    coreGrad.addColorStop(0.4, `hsla(${(hueShift + 60) % 360}, 90%, 55%, ${0.3 + this.bass * 0.3})`);
    coreGrad.addColorStop(1, 'rgba(12, 15, 29, 0)');

    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreGlow, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Sub-Bass Shockwave Rings
    if (this.beatPulse > 0.4) {
      const ringR = maxRadius * (1 - this.beatPulse * 0.7);
      this.ctx.strokeStyle = `hsla(${hueShift + 180}, 100%, 65%, ${this.beatPulse * 0.6})`;
      this.ctx.lineWidth = 3 + this.beatPulse * 4;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = `hsl(${hueShift}, 100%, 50%)`;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // 3. Audio Frequency Radial Spokes
    if (dataArray) {
      const spokes = 48;
      const step = Math.floor(dataArray.length / spokes);
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.vortexAngle * 0.5);

      for (let i = 0; i < spokes; i++) {
        const val = dataArray[i * step] / 255;
        const angle = (i / spokes) * Math.PI * 2;
        const r1 = 30 + this.bass * 20;
        const r2 = r1 + val * (maxRadius * 0.7);

        const x1 = Math.cos(angle) * r1;
        const y1 = Math.sin(angle) * r1;
        const x2 = Math.cos(angle) * r2;
        const y2 = Math.sin(angle) * r2;

        this.ctx.strokeStyle = `hsla(${(i * 7.5 + hueShift) % 360}, 95%, 60%, ${0.2 + val * 0.6})`;
        this.ctx.lineWidth = 1.5 + val * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // 4. Spinning 3D Spiral Plasma Particles
    const rotSpeed = 0.005 + this.mid * 0.03 + this.bass * 0.02;
    this.vortexAngle += rotSpeed;

    if (!this.vortexParticles) this.initVortexParticles();

    for (const p of this.vortexParticles) {
      p.angle += p.baseSpeed * (1 + this.bass * 4);
      p.dist += (0.001 + this.bass * 0.004);
      if (p.dist > 1) p.dist = 0.05;

      const currentR = p.dist * maxRadius * (1 + this.bass * 0.3);
      const x = cx + Math.cos(p.angle + this.vortexAngle) * currentR;
      const y = cy + Math.sin(p.angle + this.vortexAngle) * currentR;

      const size = p.size * (1 + this.bass * 1.2 + (p.dist < 0.2 ? 1 : 0));
      const alpha = (1 - p.dist * 0.7) * (0.4 + this.mid * 0.6);

      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue + this.treble * 40}, 90%, 65%, ${alpha})`;
      if (p.sparkle || this.beatPulse > 0.5) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
      }
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // 5. Beat Drop Supernova Burst Particles
    if (this.beatPulse > 0.8 && this.burstParticles.length < 40) {
      for (let b = 0; b < 25; b++) {
        const bAngle = Math.random() * Math.PI * 2;
        const bSpeed = 6 + Math.random() * 12;
        this.burstParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(bAngle) * bSpeed,
          vy: Math.sin(bAngle) * bSpeed,
          life: 1.0,
          size: Math.random() * 4 + 2,
          color: `hsl(${Math.random() * 360}, 100%, 65%)`
        });
      }
    }

    // Render burst particles
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const bp = this.burstParticles[i];
      bp.x += bp.vx;
      bp.y += bp.vy;
      bp.life -= 0.025;

      if (bp.life <= 0) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = bp.color;
      this.ctx.globalAlpha = bp.life;
      this.ctx.beginPath();
      this.ctx.arc(bp.x, bp.y, bp.size * bp.life, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
  }
}

// Attach to window object
window.WinampVisualizer = WinampVisualizer;
window.BackgroundVisualizer = BackgroundVisualizer;


