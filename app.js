/**
 * HyperPulse Audio Engine - Main Application Logic
 * Integrates Web Audio API, Draggable Windows, Equalizer, and Playlist.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ELEMENTS ---
  const winampContainer = document.getElementById('winamp-container');
  const windows = document.querySelectorAll('.winamp-window');

  // Controls
  const playBtn = document.getElementById('btn-play');
  const pauseBtn = document.getElementById('btn-pause');
  const stopBtn = document.getElementById('btn-stop');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const ejectBtn = document.getElementById('btn-eject');
  const fileInput = document.getElementById('file-input');

  const volumeSlider = document.getElementById('volume-slider');
  const volumeVal = document.getElementById('volume-val');
  const balanceSlider = document.getElementById('balance-slider');
  const balanceVal = document.getElementById('balance-val');
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  const seekSlider = document.getElementById('seek-slider');
  const seekCurrent = document.getElementById('seek-current');
  const seekTotal = document.getElementById('seek-total');

  // Info Panel
  const songTitle = document.getElementById('song-title');
  const timeDisplay = document.getElementById('time-display');
  const timeSign = document.getElementById('time-sign');
  const timeVal = document.getElementById('time-val');

  // Toggles & Windows
  const toggleEq = document.getElementById('toggle-eq');
  const togglePl = document.getElementById('toggle-pl');
  const eqWindow = document.getElementById('equalizer-window');
  const plWindow = document.getElementById('playlist-window');
  const closeEqBtn = document.getElementById('close-eq-btn');
  const closePlBtn = document.getElementById('close-pl-btn');
  const mainShadeToggle = document.getElementById('main-shade-toggle');
  const mainWindow = document.getElementById('main-window');

  // Equalizer
  const eqPowerBtn = document.getElementById('eq-power-btn');
  const eqPresetSelect = document.getElementById('eq-preset-select');
  const eqResetBtn = document.getElementById('eq-reset-btn');
  const preampSlider = document.getElementById('eq-preamp');
  const preampVal = document.getElementById('eq-preamp-val');
  const bandSliders = document.querySelectorAll('.band-slider');

  // Playlist
  const playlistList = document.getElementById('playlist-list');
  const plAddBtn = document.getElementById('pl-add-btn');
  const plRemBtn = document.getElementById('pl-rem-btn');
  const plClearBtn = document.getElementById('pl-clear-btn');
  const plInfoDisplay = document.getElementById('pl-info-display');
  const dropOverlay = document.getElementById('drop-overlay');

  // Cue Points
  const toggleCue = document.getElementById('toggle-cue');
  const cueWindow = document.getElementById('cue-window');
  const closeCueBtn = document.getElementById('close-cue-btn');
  const btnQuickCue = document.getElementById('btn-quick-cue');
  const cueAddCurrentBtn = document.getElementById('cue-add-current-btn');
  const cueClearAllBtn = document.getElementById('cue-clear-all-btn');
  const cueList = document.getElementById('cue-list');
  const cueInfoDisplay = document.getElementById('cue-info-display');
  const seekCueTrack = document.getElementById('seek-cue-track');

  // Audio HTML Element
  const audio = document.getElementById('audio-element');
  const canvas = document.getElementById('visualizer-canvas');
  const bgCanvas = document.getElementById('bg-visualizer-canvas');

  // --- STATE ---
  let audioContext = null;
  let sourceNode = null;
  let preampNode = null;
  let eqFilters = [];
  let pannerNode = null;
  let analyserNode = null;

  let visualizer = null;
  let bgVisualizer = null;
  let playlist = [];
  let currentTrackIndex = -1;
  let isTimeRemaining = false;
  let isEqEnabled = true;

  let cuePointsMap = {}; // { [trackKey]: [{ id, time, name }] }

  // Initial Window Positioning (Stack them vertically in the center)
  const windowPositions = {
    main: { left: 0, top: 0 },
    equalizer: { left: 0, top: 310 },
    playlist: { left: 0, top: 450 },
    cue: { left: 395, top: 0 }
  };

  // EQ Presets
  const eqPresets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rock: [4, 3, 2, -1, -2, -1, 2, 4, 5, 5],
    pop: [-2, -1, 0, 2, 4, 4, 1, -1, -2, -2],
    techno: [5, 4, 2, 0, -2, 3, 5, 5, 4, 3],
    classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 4],
    jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
    vocal: [-2, -4, -3, 1, 4, 4, 3, 1, -1, -3],
    bass: [6, 5, 4, 2, 0, -2, -3, -4, -4, -4]
  };

  // --- INITIALIZATION ---
  function init() {
    loadCuePointsFromStorage();
    setupWindowPositions();
    setupDraggableWindows();
    setupAudioGraph();
    setupVisualizer();
    setupEventListeners();

    // Add default track
    const defaultTrack = {
      name: "Where Is My Husband",
      url: "./where_is_my_husband.mp3",
      duration: 0 // Will load on metadata load
    };
    addTrackToPlaylist(defaultTrack);
    selectTrack(0, false);
  }

  // --- AUDIO SETUP ---
  function setupAudioGraph() {
    // We defer the actual creation of AudioContext until the user interacts (browsers block auto-audio)
    audio.volume = parseFloat(volumeSlider.value);
  }

  function initAudioContext() {
    if (audioContext) return;

    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Source from HTML audio
    sourceNode = audioContext.createMediaElementSource(audio);

    // 1. Preamp Gain
    preampNode = audioContext.createGain();
    sourceNode.connect(preampNode);
    updatePreampGain();

    // 2. 10-Band Equalizer filters
    const bands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    let lastFilter = preampNode;

    eqFilters = bands.map((freq) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0; // Filter bandwidth
      filter.gain.value = 0; // Starts flat

      lastFilter.connect(filter);
      lastFilter = filter;
      return filter;
    });

    // 3. Stereo Panner
    pannerNode = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
    if (pannerNode) {
      lastFilter.connect(pannerNode);
      lastFilter = pannerNode;
      updateStereoPanning();
    }

    // 4. Analyser
    analyserNode = audioContext.createAnalyser();
    lastFilter.connect(analyserNode);

    // Connect to speakers
    analyserNode.connect(audioContext.destination);

    // Load analyser to visualizers
    if (visualizer) {
      visualizer.setAnalyser(analyserNode);
    }
    if (bgVisualizer) {
      bgVisualizer.setAnalyser(analyserNode);
    }

    // Apply current UI EQ slider values
    applyEqualizerSettings();
  }

  function setupVisualizer() {
    visualizer = new window.WinampVisualizer(canvas);
    visualizer.clearCanvas();

    if (window.BackgroundVisualizer && bgCanvas) {
      bgVisualizer = new window.BackgroundVisualizer(bgCanvas);
      bgVisualizer.onBeat = () => {
        // Rhythmic neon glow pulse on all player windows
        windows.forEach(win => {
          win.classList.add('beat-pulse');
          setTimeout(() => win.classList.remove('beat-pulse'), 120);
        });
      };
    }
  }

  // --- WINDOW MANAGEMENT (DRAG AND SNAP) ---
  function setupWindowPositions() {
    const isMobile = window.innerWidth <= 600;
    const winWidth = Math.min(380, window.innerWidth - 20);

    if (isMobile) {
      const mobileTops = {
        main: 15,
        equalizer: 320,
        playlist: 460,
        cue: 600
      };
      windows.forEach(win => {
        document.body.appendChild(win);
        const winId = win.dataset.windowId;
        const left = Math.max(10, (window.innerWidth - winWidth) / 2);
        win.style.position = 'absolute';
        win.style.width = `${winWidth}px`;
        win.style.left = `${left}px`;
        win.style.top = `${mobileTops[winId] || 15}px`;
        win.style.margin = '0';
      });
    } else {
      const stackWidth = 380;
      const stackHeight = 640;
      const centerX = Math.max(10, (window.innerWidth - stackWidth) / 2);
      const centerY = Math.max(10, (window.innerHeight - stackHeight) / 2);

      windows.forEach(win => {
        document.body.appendChild(win);
        const winId = win.dataset.windowId;
        const pos = windowPositions[winId];

        win.style.position = 'absolute';
        win.style.left = `${Math.max(10, centerX + pos.left)}px`;
        win.style.top = `${Math.max(10, centerY + pos.top)}px`;
        win.style.margin = '0';
      });
    }
  }

  function setupDraggableWindows() {
    const snapThreshold = 12; // Pixels distance to snap to adjacent windows

    windows.forEach(win => {
      const titlebar = win.querySelector('.window-titlebar');

      function initiateDrag(clientX, clientY, target) {
        if (target.closest('.win-btn')) return;

        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }

        win.classList.add('is-dragging');

        // Move window to front
        windows.forEach(w => w.style.zIndex = '10');
        win.style.zIndex = '100';

        const rect = win.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        function handleMove(moveClientX, moveClientY) {
          let targetLeft = moveClientX - offsetX;
          let targetTop = moveClientY - offsetY;

          // SNAP LOGIC
          windows.forEach(otherWin => {
            if (otherWin === win || otherWin.style.display === 'none') return;
            const otherRect = otherWin.getBoundingClientRect();

            // Vertical Snap
            if (Math.abs(targetLeft - otherRect.left) < snapThreshold) {
              targetLeft = otherRect.left;
            } else if (Math.abs((targetLeft + rect.width) - (otherRect.left + otherRect.width)) < snapThreshold) {
              targetLeft = otherRect.left + otherRect.width - rect.width;
            } else if (Math.abs((targetLeft + rect.width) - otherRect.left) < snapThreshold) {
              targetLeft = otherRect.left - rect.width;
            } else if (Math.abs(targetLeft - (otherRect.left + otherRect.width)) < snapThreshold) {
              targetLeft = otherRect.left + otherRect.width;
            }

            // Horizontal Snap
            if (Math.abs(targetTop - otherRect.top) < snapThreshold) {
              targetTop = otherRect.top;
            } else if (Math.abs((targetTop + rect.height) - (otherRect.top + otherRect.height)) < snapThreshold) {
              targetTop = otherRect.top + otherRect.height - rect.height;
            } else if (Math.abs((targetTop + rect.height) - otherRect.top) < snapThreshold) {
              targetTop = otherRect.top - rect.height;
            } else if (Math.abs(targetTop - (otherRect.top + otherRect.height)) < snapThreshold) {
              targetTop = otherRect.top + otherRect.height;
            }
          });

          // Bounds safety
          targetLeft = Math.max(5, Math.min(window.innerWidth - rect.width - 5, targetLeft));
          targetTop = Math.max(5, Math.min(window.innerHeight - rect.height - 5, targetTop));

          win.style.left = `${targetLeft}px`;
          win.style.top = `${targetTop}px`;
        }

        function onMouseMove(moveEvent) {
          handleMove(moveEvent.clientX, moveEvent.clientY);
        }

        function onTouchMove(touchEvent) {
          if (touchEvent.touches.length > 0) {
            handleMove(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
          }
        }

        function stopDrag() {
          win.classList.remove('is-dragging');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', stopDrag);
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', stopDrag);
          document.removeEventListener('touchcancel', stopDrag);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchcancel', stopDrag);
      }

      titlebar.addEventListener('mousedown', (e) => {
        initiateDrag(e.clientX, e.clientY, e.target);
      });

      titlebar.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          initiateDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
        }
      }, { passive: true });
    });
  }

  // --- PLAYBACK CONTROLS ---
  function play() {
    if (playlist.length === 0) return;

    // Lazy Audio Init
    initAudioContext();

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    audio.play().then(() => {
      visualizer.start();
      if (bgVisualizer) bgVisualizer.start();
      playBtn.classList.add('active');
      pauseBtn.classList.remove('paused');
      // Highlight playing in playlist
      updatePlaylistUI();
    }).catch(err => {
      console.error("Playback failed: ", err);
    });
  }

  function pause() {
    if (audio.paused) {
      play();
    } else {
      audio.pause();
      visualizer.stop();
      if (bgVisualizer) bgVisualizer.stop();
      playBtn.classList.remove('active');
      pauseBtn.classList.add('paused');
    }
  }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    visualizer.stop();
    if (bgVisualizer) bgVisualizer.stop();
    playBtn.classList.remove('active');
    pauseBtn.classList.remove('paused');
    updateTimeDisplay();
  }

  function nextTrack() {
    if (playlist.length === 0) return;
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playlist.length) {
      nextIndex = 0; // Loop back to start
    }
    selectTrack(nextIndex, true);
  }

  function prevTrack() {
    if (playlist.length === 0) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1; // Loop to end
    }
    selectTrack(prevIndex, true);
  }

  function selectTrack(index, shouldPlay = true) {
    if (index < 0 || index >= playlist.length) return;

    currentTrackIndex = index;
    const track = playlist[index];

    audio.src = track.url;

    // Update marquee text
    songTitle.textContent = `${index + 1}. ${track.name}`;

    // Reset seek
    seekSlider.value = 0;
    seekCurrent.textContent = "00:00";

    updatePlaylistUI();
    renderCuePoints();
    renderSeekbarCueMarkers();

    if (shouldPlay) {
      // Small delay to allow audio.src update
      setTimeout(play, 100);
    } else {
      // Just load details
      audio.load();
    }
  }

  // --- EQUALIZER LOGIC ---
  function updatePreampGain() {
    if (!preampNode) return;
    const dbValue = parseFloat(preampSlider.value);
    preampVal.textContent = (dbValue > 0 ? '+' : '') + dbValue + 'dB';

    if (isEqEnabled) {
      // Map dB to linear gain: gain = 10^(dB/20)
      preampNode.gain.value = Math.pow(10, dbValue / 20);
    } else {
      preampNode.gain.value = 1.0; // Unity gain if disabled
    }
  }

  function applyEqualizerSettings() {
    if (!audioContext) return;

    updatePreampGain();

    bandSliders.forEach((slider, i) => {
      const dbValue = parseFloat(slider.value);
      // Update the inline text value under sliders
      const valLabel = slider.parentElement.nextElementSibling || slider.closest('.eq-slider-group').querySelector('.eq-slider-value');
      if (valLabel) {
        valLabel.textContent = (dbValue > 0 ? '+' : '') + dbValue;
      }

      if (eqFilters[i]) {
        if (isEqEnabled) {
          eqFilters[i].gain.value = dbValue;
        } else {
          eqFilters[i].gain.value = 0; // Flat if EQ disabled
        }
      }
    });
  }

  function loadEqPreset(presetName) {
    const gains = eqPresets[presetName];
    if (!gains) return;

    bandSliders.forEach((slider, index) => {
      slider.value = gains[index];
    });

    applyEqualizerSettings();
  }

  function toggleEqualizer(force) {
    isEqEnabled = force !== undefined ? force : !isEqEnabled;

    if (isEqEnabled) {
      eqPowerBtn.classList.add('active');
    } else {
      eqPowerBtn.classList.remove('active');
    }

    applyEqualizerSettings();
  }

  // --- STEREO PANNING ---
  function updateStereoPanning() {
    if (!pannerNode) return;
    const val = parseFloat(balanceSlider.value);

    let label = 'C';
    if (val < 0) {
      label = `L${Math.abs(Math.round(val * 100))}%`;
    } else if (val > 0) {
      label = `R${Math.round(val * 100)}%`;
    }
    balanceVal.textContent = label;

    pannerNode.pan.value = val;
  }

  // --- PLAYLIST LOGIC ---
  function addTrackToPlaylist(track) {
    playlist.push(track);
    renderPlaylist();
    updatePlaylistInfo();
  }

  function renderPlaylist() {
    playlistList.innerHTML = '';

    playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      if (index === currentTrackIndex) {
        item.classList.add('active');
        if (!audio.paused) item.classList.add('playing');
      }

      item.innerHTML = `
        <div class="pl-left">
          <span class="pl-num">${String(index + 1).padStart(2, '0')}</span>
          <span class="pl-title">${track.name}</span>
        </div>
        <span class="pl-dur">${formatTime(track.duration || 0)}</span>
      `;

      item.addEventListener('click', () => {
        selectTrack(index, true);
      });

      playlistList.appendChild(item);
    });
  }

  function updatePlaylistUI() {
    const items = playlistList.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
      item.classList.remove('active', 'playing');
      if (index === currentTrackIndex) {
        item.classList.add('active');
        if (!audio.paused) {
          item.classList.add('playing');
        }
      }
    });
  }

  function removeSelectedTrack() {
    if (currentTrackIndex === -1 || playlist.length === 0) return;

    const wasPlaying = !audio.paused;
    playlist.splice(currentTrackIndex, 1);

    if (playlist.length === 0) {
      stop();
      currentTrackIndex = -1;
      audio.src = '';
      songTitle.textContent = "No tracks loaded";
      renderPlaylist();
      updatePlaylistInfo();
      return;
    }

    // Shift current index safely
    if (currentTrackIndex >= playlist.length) {
      currentTrackIndex = playlist.length - 1;
    }

    selectTrack(currentTrackIndex, wasPlaying);
    renderPlaylist();
    updatePlaylistInfo();
  }

  function clearPlaylist() {
    stop();
    playlist = [];
    currentTrackIndex = -1;
    audio.src = '';
    songTitle.textContent = "No tracks loaded";
    renderPlaylist();
    updatePlaylistInfo();
  }

  function updatePlaylistInfo() {
    const count = playlist.length;
    let totalDuration = 0;

    playlist.forEach(t => {
      totalDuration += t.duration || 0;
    });

    plInfoDisplay.textContent = `${count} track${count !== 1 ? 's' : ''} [${formatTime(totalDuration)}]`;
  }

  // --- CUE POINTS MANAGEMENT ---
  function getTrackKey(track) {
    if (!track) return null;
    return track.url || track.name;
  }

  function loadCuePointsFromStorage() {
    try {
      const stored = localStorage.getItem('hyperpulse_cue_points') || localStorage.getItem('winamp_cue_points');
      if (stored) {
        cuePointsMap = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load cue points from storage", e);
    }
  }

  function saveCuePointsToStorage() {
    try {
      localStorage.setItem('hyperpulse_cue_points', JSON.stringify(cuePointsMap));
    } catch (e) {
      console.warn("Failed to save cue points to storage", e);
    }
  }

  function getCurrentTrackCues() {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return [];
    const key = getTrackKey(playlist[currentTrackIndex]);
    return cuePointsMap[key] || [];
  }

  function addCuePoint(timeOverride) {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return;
    const track = playlist[currentTrackIndex];
    const key = getTrackKey(track);
    const time = timeOverride !== undefined ? timeOverride : audio.currentTime;

    if (!cuePointsMap[key]) {
      cuePointsMap[key] = [];
    }

    const cues = cuePointsMap[key];
    const count = cues.length + 1;
    const newCue = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      time: time,
      name: `Cue ${count} - ${formatTime(time)}`
    };

    // Keep cues sorted by timestamp ascending
    cues.push(newCue);
    cues.sort((a, b) => a.time - b.time);

    saveCuePointsToStorage();
    renderCuePoints();
    renderSeekbarCueMarkers();
  }

  function deleteCuePoint(cueId) {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return;
    const key = getTrackKey(playlist[currentTrackIndex]);
    if (!cuePointsMap[key]) return;

    cuePointsMap[key] = cuePointsMap[key].filter(c => c.id !== cueId);
    saveCuePointsToStorage();
    renderCuePoints();
    renderSeekbarCueMarkers();
  }

  function clearAllCuePoints() {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return;
    const key = getTrackKey(playlist[currentTrackIndex]);
    cuePointsMap[key] = [];
    saveCuePointsToStorage();
    renderCuePoints();
    renderSeekbarCueMarkers();
  }

  function jumpToCue(time) {
    // Ensure AudioContext up
    initAudioContext();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    audio.currentTime = time;
    if (audio.paused && playlist.length > 0) {
      play();
    }
    updateTimeDisplay();
  }

  function renderCuePoints() {
    if (!cueList) return;
    cueList.innerHTML = '';
    const cues = getCurrentTrackCues();

    if (cues.length === 0) {
      cueList.innerHTML = '<div class="cue-empty-msg">No cue points set for this track</div>';
      if (cueInfoDisplay) cueInfoDisplay.textContent = '0 cue points';
      return;
    }

    cues.forEach((cue, index) => {
      const item = document.createElement('div');
      item.className = 'cue-item';

      item.innerHTML = `
        <div class="cue-left">
          <span class="cue-num">#${index + 1}</span>
          <span class="cue-time">${formatTime(cue.time)}</span>
          <input type="text" class="cue-name-input" value="${cue.name.replace(/"/g, '&quot;')}" title="Click to rename cue point">
        </div>
        <div class="cue-actions">
          <button class="cue-btn play-cue-btn" title="Jump to timestamp">PLAY</button>
          <button class="cue-btn rem-cue-btn" title="Delete cue point">×</button>
        </div>
      `;

      // Jump playback on play button click
      const playBtn = item.querySelector('.play-cue-btn');
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToCue(cue.time);
      });

      item.addEventListener('click', (e) => {
        if (!e.target.closest('.cue-name-input') && !e.target.closest('.rem-cue-btn')) {
          jumpToCue(cue.time);
        }
      });

      // Rename input blur/change
      const nameInput = item.querySelector('.cue-name-input');
      nameInput.addEventListener('change', (e) => {
        cue.name = e.target.value;
        saveCuePointsToStorage();
        renderSeekbarCueMarkers();
      });
      nameInput.addEventListener('click', (e) => e.stopPropagation());

      // Delete button
      const remBtn = item.querySelector('.rem-cue-btn');
      remBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCuePoint(cue.id);
      });

      cueList.appendChild(item);
    });

    if (cueInfoDisplay) {
      cueInfoDisplay.textContent = `${cues.length} cue point${cues.length !== 1 ? 's' : ''}`;
    }
  }

  function renderSeekbarCueMarkers() {
    if (!seekCueTrack) return;
    seekCueTrack.innerHTML = '';
    const duration = audio.duration;
    if (!duration || duration <= 0) return;

    const cues = getCurrentTrackCues();
    cues.forEach((cue) => {
      const percent = (cue.time / duration) * 100;
      if (percent < 0 || percent > 100) return;

      const marker = document.createElement('div');
      marker.className = 'seek-cue-marker';
      marker.style.left = `${percent}%`;
      marker.title = `${cue.name} (${formatTime(cue.time)})`;

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToCue(cue.time);
      });

      seekCueTrack.appendChild(marker);
    });
  }

  // --- FILE HANDLING & DRAG & DROP ---
  function handleFiles(files) {
    let selectFirstNew = playlist.length === 0;
    let initialNewIndex = playlist.length;

    Array.from(files).forEach(file => {
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) return;

      const objectUrl = URL.createObjectURL(file);
      const name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

      // Temporary track object, duration will update when loaded
      const track = {
        name: name,
        url: objectUrl,
        duration: 0
      };

      // Get duration by loading momentarily in a temp audio object
      const tempAudio = new Audio(objectUrl);
      tempAudio.addEventListener('loadedmetadata', () => {
        track.duration = tempAudio.duration;
        renderPlaylist();
        updatePlaylistInfo();
      });

      addTrackToPlaylist(track);
    });

    if (selectFirstNew) {
      selectTrack(initialNewIndex, true);
    }
  }

  // --- HELPERS ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimeDisplay() {
    let t = audio.currentTime;

    if (isTimeRemaining) {
      t = Math.max(0, audio.duration - t);
      timeSign.textContent = '-';
    } else {
      timeSign.textContent = '';
    }

    timeVal.textContent = formatTime(t);
    seekCurrent.textContent = formatTime(audio.currentTime);

    // Sync seekbar
    if (audio.duration) {
      seekSlider.value = (audio.currentTime / audio.duration) * 100;
    } else {
      seekSlider.value = 0;
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Playback Buttons
    playBtn.addEventListener('click', play);
    pauseBtn.addEventListener('click', pause);
    stopBtn.addEventListener('click', stop);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);

    // Eject trigger file selector
    ejectBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Audio tag event hooks
    audio.addEventListener('timeupdate', updateTimeDisplay);

    audio.addEventListener('loadedmetadata', () => {
      // Sync track duration in playlist state if it was 0
      if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
        playlist[currentTrackIndex].duration = audio.duration;
        renderPlaylist();
        updatePlaylistInfo();
      }
      seekTotal.textContent = formatTime(audio.duration);
      updateTimeDisplay();
      renderSeekbarCueMarkers();
    });

    audio.addEventListener('ended', () => {
      nextTrack();
    });

    // Seek Slider drag
    seekSlider.addEventListener('input', () => {
      if (audio.duration) {
        const targetTime = (parseFloat(seekSlider.value) / 100) * audio.duration;
        seekCurrent.textContent = formatTime(targetTime);
      }
    });

    seekSlider.addEventListener('change', () => {
      if (audio.duration) {
        audio.currentTime = (parseFloat(seekSlider.value) / 100) * audio.duration;
        initAudioContext(); // Make sure context is up on seek
      }
    });

    // Time Click toggle (Elapsed / Remaining)
    timeDisplay.addEventListener('click', () => {
      isTimeRemaining = !isTimeRemaining;
      updateTimeDisplay();
    });

    // Volume Slider
    volumeSlider.addEventListener('input', () => {
      const vol = parseFloat(volumeSlider.value);
      audio.volume = vol;
      volumeVal.textContent = Math.round(vol * 100) + '%';
    });

    // Balance Slider
    balanceSlider.addEventListener('input', () => {
      initAudioContext();
      updateStereoPanning();
    });
    balanceSlider.addEventListener('dblclick', () => {
      balanceSlider.value = 0;
      initAudioContext();
      updateStereoPanning();
    });

    // HyperPulse Logo Easter Egg
    const logoElement = document.querySelector('.hyperpulse-logo');
    if (logoElement) {
      logoElement.style.cursor = 'pointer';
      logoElement.addEventListener('dblclick', () => {
        // Voice synthesis
        if ('speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance("HyperPulse: Next-generation audio power!");
          msg.pitch = 0.9;
          msg.rate = 1.1;
          window.speechSynthesis.speak(msg);
        }
        
        // Barrel roll animation
        const container = document.getElementById('winamp-container');
        if (container) {
          container.classList.add('barrel-roll-active');
          setTimeout(() => {
            container.classList.remove('barrel-roll-active');
          }, 1000);
        }
      });
    }

    // Keyboard Shortcuts: Space (Toggle Play/Pause) & Double Space (Restart track)
    let spaceTimer = null;
    let lastSpaceTime = 0;

    // Surprise Feature 2: Rave Mode
    let partyCode = ['p', 'a', 'r', 't', 'y'];
    let partyIndex = 0;
    let isRaveMode = false;
    let raveInterval;

    document.addEventListener('keydown', (e) => {
      // Ignore if typing in inputs or editable areas
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

      // Spacebar Keyboard Shortcut
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // Prevent page scrolling

        const now = Date.now();
        const timeDiff = now - lastSpaceTime;

        if (timeDiff < 300 && spaceTimer !== null) {
          // Double space (fast press): start song from beginning
          clearTimeout(spaceTimer);
          spaceTimer = null;
          lastSpaceTime = 0;

          initAudioContext();
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
          }
          audio.currentTime = 0;
          play();
        } else {
          // Single space press: delay slightly to check for double press
          lastSpaceTime = now;
          if (spaceTimer) clearTimeout(spaceTimer);
          spaceTimer = setTimeout(() => {
            spaceTimer = null;
            if (audio.paused) {
              play();
            } else {
              pause();
            }
          }, 250);
        }
        return;
      }

      if (e.key.toLowerCase() === partyCode[partyIndex]) {
        partyIndex++;
        if (partyIndex === partyCode.length) {
          partyIndex = 0;
          toggleRaveMode();
        }
      } else {
        partyIndex = 0;
        if (e.key.toLowerCase() === partyCode[0]) {
          partyIndex = 1;
        }
      }
    });

    function toggleRaveMode() {
      isRaveMode = !isRaveMode;
      const body = document.body;
      const eqSliders = document.querySelectorAll('.band-slider');

      if (isRaveMode) {
        body.classList.add('rave-mode-active');
        if ('speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance("Rave mode activated!");
          msg.pitch = 1.5;
          window.speechSynthesis.speak(msg);
        }
        
        raveInterval = setInterval(() => {
          eqSliders.forEach(slider => {
            if (!slider.classList.contains('rave-bouncing')) {
              slider.classList.add('rave-bouncing');
            }
            slider.value = Math.floor(Math.random() * 25) - 12;
            
            // Trigger input event to update EQ filters if music is playing
            const event = new Event('input');
            slider.dispatchEvent(event);
          });
        }, 200);
        
      } else {
        body.classList.remove('rave-mode-active');
        clearInterval(raveInterval);
        eqSliders.forEach(slider => {
          slider.classList.remove('rave-bouncing');
          slider.value = 0;
          const event = new Event('input');
          slider.dispatchEvent(event);
        });
      }
    }

    // Speed Slider
    speedSlider.addEventListener('input', () => {
      const spd = parseFloat(speedSlider.value);
      audio.playbackRate = spd;
      speedVal.textContent = spd.toFixed(2) + 'x';
    });
    speedSlider.addEventListener('dblclick', () => {
      speedSlider.value = 1.0;
      audio.playbackRate = 1.0;
      speedVal.textContent = '1.00x';
    });

    // Winamp Window Toggle Buttons (EQ / PL)
    toggleEq.addEventListener('click', () => {
      const isActive = toggleEq.classList.toggle('active');
      eqWindow.style.display = isActive ? 'flex' : 'none';
    });

    togglePl.addEventListener('click', () => {
      const isActive = togglePl.classList.toggle('active');
      plWindow.style.display = isActive ? 'flex' : 'none';
    });

    if (toggleCue) {
      toggleCue.addEventListener('click', () => {
        const isActive = toggleCue.classList.toggle('active');
        cueWindow.style.display = isActive ? 'flex' : 'none';
      });
    }

    // Close buttons on windows
    closeEqBtn.addEventListener('click', () => {
      toggleEq.classList.remove('active');
      eqWindow.style.display = 'none';
    });

    closePlBtn.addEventListener('click', () => {
      togglePl.classList.remove('active');
      plWindow.style.display = 'none';
    });

    if (closeCueBtn) {
      closeCueBtn.addEventListener('click', () => {
        toggleCue.classList.remove('active');
        cueWindow.style.display = 'none';
      });
    }

    // Cue Point Action Buttons
    if (btnQuickCue) {
      btnQuickCue.addEventListener('click', () => addCuePoint());
    }

    if (cueAddCurrentBtn) {
      cueAddCurrentBtn.addEventListener('click', () => addCuePoint());
    }

    if (cueClearAllBtn) {
      cueClearAllBtn.addEventListener('click', () => clearAllCuePoints());
    }

    // Shade main window (like classic Winamp double-click/shade button)
    mainShadeToggle.addEventListener('click', () => {
      mainWindow.classList.toggle('shaded');
    });

    // Equalizer sliders change
    preampSlider.addEventListener('input', () => {
      initAudioContext();
      updatePreampGain();
    });

    bandSliders.forEach(slider => {
      slider.addEventListener('input', () => {
        initAudioContext();
        applyEqualizerSettings();
      });
    });

    // Preset dropdown change
    eqPresetSelect.addEventListener('change', (e) => {
      initAudioContext();
      loadEqPreset(e.target.value);
    });

    // Equalizer reset flat
    eqResetBtn.addEventListener('click', () => {
      initAudioContext();
      eqPresetSelect.value = 'flat';
      loadEqPreset('flat');
    });

    // Equalizer power button
    eqPowerBtn.addEventListener('click', () => {
      initAudioContext();
      toggleEqualizer();
    });

    // Playlist bottom actions
    plAddBtn.addEventListener('click', () => fileInput.click());
    plRemBtn.addEventListener('click', removeSelectedTrack);
    plClearBtn.addEventListener('click', clearPlaylist);

    // Visualizer canvas click (toggles modes)
    canvas.addEventListener('click', () => {
      const modes = ['spectrum', 'oscilloscope', 'spectrogram', 'vortex'];
      let currentIdx = modes.indexOf(visualizer.mode);
      let nextIdx = (currentIdx + 1) % modes.length;
      const nextMode = modes[nextIdx];

      visualizer.setMode(nextMode);

      // Sync active state in UI overlays if visible
      document.querySelectorAll('.viz-mode').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === nextMode);
      });
    });

    document.querySelectorAll('.viz-mode').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid double toggle from canvas click
        const mode = el.dataset.mode;
        visualizer.setMode(mode);
        document.querySelectorAll('.viz-mode').forEach(item => {
          item.classList.toggle('active', item.dataset.mode === mode);
        });
      });
    });

    // --- GLOBAL DRAG AND DROP HANDLING ---
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dropOverlay.classList.remove('hidden');
    });

    dropOverlay.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    dropOverlay.addEventListener('dragleave', (e) => {
      // Only hide if we leave the window/overlay itself
      if (e.target === dropOverlay) {
        dropOverlay.classList.add('hidden');
      }
    });

    dropOverlay.addEventListener('drop', (e) => {
      e.preventDefault();
      dropOverlay.classList.add('hidden');
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });

    // --- BACKGROUND VISUALIZER CONTROLS ---
    const bgPresetBtns = document.querySelectorAll('.bg-preset-btn');
    const bgVisToggle = document.getElementById('bg-vis-toggle');

    bgPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bgMode;
        if (bgVisualizer) {
          bgVisualizer.setMode(mode);
        }
        bgPresetBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    if (bgVisToggle) {
      bgVisToggle.addEventListener('click', () => {
        if (bgVisualizer) {
          const isEnabled = !bgVisualizer.isEnabled;
          bgVisualizer.toggleEnabled(isEnabled);
          bgVisToggle.classList.toggle('active', isEnabled);
          bgVisToggle.textContent = isEnabled ? 'ON' : 'OFF';
        }
      });
    }

    // Keyboard shortcuts for cue points (1-9, and 0 for start)
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const num = parseInt(e.key);
      if (num === 0) {
        jumpToCue(0);
      } else if (num >= 1 && num <= 9) {
        const cues = getCurrentTrackCues();
        if (cues && cues.length >= num) {
          jumpToCue(cues[num - 1].time);
        }
      }
    });
  }

  // Run the app!
  init();
});
