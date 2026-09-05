// dual-play.js

let ytPlayer;
let audioPlayer;
let isReady = false;
let isPlaying = false;
let syncInterval;

const DOM = {
  status: document.getElementById('sync-status'),
  btnPlay: document.getElementById('dual-btn-play'),
  btnPause: document.getElementById('dual-btn-pause'),
  btnStop: document.getElementById('dual-btn-stop'),
  seekCurrent: document.getElementById('dual-seek-current'),
  seekTotal: document.getElementById('dual-seek-total'),
  seekSlider: document.getElementById('dual-seek-slider'),
  ytVolume: document.getElementById('yt-volume'),
  mp3Volume: document.getElementById('mp3-volume')
};

audioPlayer = document.getElementById('dual-audio-element');

// YouTube API Ready Callback
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    videoId: 'rK5TyISxZ_M', // The requested video ID
    playerVars: {
      'playsinline': 1,
      'controls': 0, // Disable native YT controls to use our unified ones
      'disablekb': 1,
      'rel': 0
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  // Check if audio is also ready
  checkReadyState();
}

audioPlayer.addEventListener('canplaythrough', checkReadyState);

function checkReadyState() {
  if (ytPlayer && ytPlayer.getPlayerState && audioPlayer.readyState >= 3) {
    isReady = true;
    DOM.status.textContent = "Ready to Play";
    DOM.status.style.color = "#00ffcc";

    // Enable buttons
    DOM.btnPlay.disabled = false;
    DOM.btnPause.disabled = false;
    DOM.btnStop.disabled = false;

    // Set durations
    const duration = audioPlayer.duration;
    DOM.seekSlider.max = duration;
    DOM.seekTotal.textContent = formatTime(duration);
  }
}

// Ensure audio gets ready event if it's already loaded
if (audioPlayer.readyState >= 3) {
  checkReadyState();
} else {
  // If we can't load the specific mp3 locally, we'll try to just enable it anyway after 3 seconds for testing
  setTimeout(() => {
    if (!isReady) {
      console.warn("Audio might not be fully loaded, forcing ready state.");
      isReady = true;
      DOM.status.textContent = "Ready (Forced)";
      DOM.status.style.color = "#ffaa00";
      DOM.btnPlay.disabled = false;
      DOM.btnPause.disabled = false;
      DOM.btnStop.disabled = false;
      DOM.seekSlider.max = (ytPlayer && typeof ytPlayer.getDuration === 'function') ? ytPlayer.getDuration() : 100;
    }
  }, 3000);
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    stopPlayback();
  }
}

// Playback Controls
DOM.btnPlay.addEventListener('click', () => {
  if (!isReady) return;
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  } else {
    console.warn("YouTube player not ready yet.");
  }
  audioPlayer.play().catch(e => console.error("Audio play failed:", e));
  isPlaying = true;
  DOM.status.textContent = "Playing Synced";

  DOM.btnPlay.classList.add('active');
  DOM.btnPause.classList.remove('active');

  startSyncLoop();
});

DOM.btnPause.addEventListener('click', () => {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
  audioPlayer.pause();
  isPlaying = false;
  DOM.status.textContent = "Paused";

  DOM.btnPause.classList.add('active');
  DOM.btnPlay.classList.remove('active');

  stopSyncLoop();
});

DOM.btnStop.addEventListener('click', stopPlayback);

function stopPlayback() {
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    ytPlayer.stopVideo();
  }
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  isPlaying = false;
  DOM.status.textContent = "Stopped";

  DOM.btnPlay.classList.remove('active');
  DOM.btnPause.classList.remove('active');

  stopSyncLoop();
  updateSeekUI(0);
}

// Seeking
DOM.seekSlider.addEventListener('input', (e) => {
  const time = parseFloat(e.target.value);
  DOM.seekCurrent.textContent = formatTime(time);
});

DOM.seekSlider.addEventListener('change', (e) => {
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(time, true);
  }
  audioPlayer.currentTime = time;
});

// Volume Controls
DOM.ytVolume.addEventListener('input', (e) => {
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(e.target.value);
  }
});

DOM.mp3Volume.addEventListener('input', (e) => {
  audioPlayer.volume = e.target.value;
});

// Synchronization Loop
function startSyncLoop() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (isPlaying && ytPlayer && ytPlayer.getCurrentTime) {
      const ytTime = ytPlayer.getCurrentTime();
      const audioTime = audioPlayer.currentTime;

      // Update UI
      updateSeekUI(audioTime);

      // Auto-correct drift if difference is more than 0.3 seconds
      if (Math.abs(ytTime - audioTime) > 0.3) {
        console.log(`Sync correcting: YT(${ytTime}) Audio(${audioTime})`);
        audioPlayer.currentTime = ytTime;
      }
    }
  }, 500);
}

function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function updateSeekUI(time) {
  DOM.seekSlider.value = time;
  DOM.seekCurrent.textContent = formatTime(time);
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Keyboard Shortcuts: Space (Toggle Play/Pause) & Double Space (Restart from beginning)
let dualSpaceTimer = null;
let dualLastSpaceTime = 0;

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();

    const now = Date.now();
    const timeDiff = now - dualLastSpaceTime;

    if (timeDiff < 300 && dualSpaceTimer !== null) {
      clearTimeout(dualSpaceTimer);
      dualSpaceTimer = null;
      dualLastSpaceTime = 0;

      // Restart from beginning
      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(0, true);
        if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
      }
      audioPlayer.currentTime = 0;
      audioPlayer.play().catch(() => {});
      isPlaying = true;
      DOM.status.textContent = "Playing Synced";
      DOM.btnPlay.classList.add('active');
      DOM.btnPause.classList.remove('active');
      startSyncLoop();
    } else {
      dualLastSpaceTime = now;
      if (dualSpaceTimer) clearTimeout(dualSpaceTimer);
      dualSpaceTimer = setTimeout(() => {
        dualSpaceTimer = null;
        if (isPlaying) {
          DOM.btnPause.click();
        } else {
          DOM.btnPlay.click();
        }
      }, 250);
    }
  }
});
