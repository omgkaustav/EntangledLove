/**
 * game.js - Core State Controller, Audio Manager, and Interaction Engine
 * 
 * Manages evenings, shot progression, curtains, notebook scoring,
 * audio playback (HTML5 Audio + WebAudio synth fallback), and title screen.
 */

import {
  AtlasClient,
  simulateLocalGraphBatch,
  STORAGE_KEY_API_KEY,
  STORAGE_KEY_ENDPOINT,
  STORAGE_KEY_SHOTS,
  STORAGE_KEY_META,
  ATLAS_DEFAULT_BASE_URL
} from './atlas.js';

import {
  computeStatistics,
  generateStatementList,
  scoreNotebook,
  ACTIVITIES
} from './stats.js';

import {
  SceneRenderer,
  WINDOW_A,
  WINDOW_B
} from './draw.js';

/**
 * Audio Manager: handles curtain swipe and quiet activity loops
 * Supports both vendored WAV files and procedural WebAudio fallback.
 */
class AudioManager {
  constructor() {
    this.isMuted = false;
    this.audioContext = null;
    this.audioUnlocked = false;

    // HTML5 Audio Elements
    this.soundFiles = {
      swipe: 'assets/audio/curtain_swipe.wav',
      bed: 'assets/audio/bed_tone.wav',
      thinking: 'assets/audio/thinking_loop.wav',
      gaming: 'assets/audio/game_clicks.wav',
      cooking: 'assets/audio/simmer_loop.wav'
    };

    this.audioElements = {};
    this.initAudioElements();

    // WebAudio active loop nodes for fallback
    this.activeSynthLoops = {
      A: null,
      B: null
    };
  }

  initAudioElements() {
    for (const [key, path] of Object.entries(this.soundFiles)) {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      if (key !== 'swipe') {
        audio.loop = true;
      }
      this.audioElements[key] = audio;
    }
  }

  unlockAudioContext() {
    if (this.audioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      }
      this.audioUnlocked = true;
      console.log('[Audio] Audio context initialized and unlocked');
    } catch (e) {
      console.warn('[Audio] Could not initialize WebAudio context:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAllLoops();
    }
    return this.isMuted;
  }

  playCurtainSwipe() {
    if (this.isMuted) return;
    this.unlockAudioContext();

    const swipe = this.audioElements.swipe;
    if (swipe) {
      swipe.volume = 0.28;
      swipe.currentTime = 0;
      swipe.play().catch(() => {
        // Fallback to WebAudio synth swipe
        this.synthCurtainSwipe();
      });
    } else {
      this.synthCurtainSwipe();
    }
  }

  updateActivityLoops(isOpenA, actA, isOpenB, actB) {
    if (this.isMuted) {
      this.stopAllLoops();
      return;
    }
    this.unlockAudioContext();

    const actKeys = ['bed', 'thinking', 'gaming', 'cooking'];

    // Room A Audio Loop
    const keyA = actKeys[actA];
    if (isOpenA) {
      this.playRoomAudio('A', keyA, actA);
    } else {
      this.stopRoomAudio('A');
    }

    // Room B Audio Loop
    const keyB = actKeys[actB];
    if (isOpenB) {
      this.playRoomAudio('B', keyB, actB);
    } else {
      this.stopRoomAudio('B');
    }
  }

  playRoomAudio(roomKey, soundKey, actCode) {
    const audio = this.audioElements[soundKey];
    if (audio) {
      audio.volume = 0.22; // Quiet ambient loop per requirements
      if (audio.paused) {
        audio.play().catch(() => {
          this.synthActivityLoop(roomKey, actCode);
        });
      }
    } else {
      this.synthActivityLoop(roomKey, actCode);
    }
  }

  stopRoomAudio(roomKey) {
    // If WebAudio synth loop was active for this room
    if (this.activeSynthLoops[roomKey]) {
      try {
        this.activeSynthLoops[roomKey].stop();
      } catch (_) {}
      this.activeSynthLoops[roomKey] = null;
    }
  }

  stopAllLoops() {
    for (const [key, audio] of Object.entries(this.audioElements)) {
      if (key !== 'swipe') {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
      }
    }
    this.stopRoomAudio('A');
    this.stopRoomAudio('B');
  }

  // Procedural WebAudio synthesis fallback methods
  synthCurtainSwipe() {
    if (!this.audioContext || this.isMuted) return;
    try {
      const ctx = this.audioContext;
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / bufferSize));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (_) {}
  }

  synthActivityLoop(roomKey, actCode) {
    if (!this.audioContext || this.isMuted) return;
    if (this.activeSynthLoops[roomKey]) return; // already playing
    try {
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (actCode === 0) { // Bed: deep warm 60Hz hum
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
      } else if (actCode === 1) { // Thinking: soft 432Hz ambient chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(432, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
      } else if (actCode === 2) { // Game: gentle pulse
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
      } else { // Cooking: soft low filtered rumble
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, ctx.currentTime);
        gain.gain.setValueAtTime(0.025, ctx.currentTime);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.activeSynthLoops[roomKey] = {
        stop: () => {
          try {
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
            osc.stop(ctx.currentTime + 0.1);
          } catch (_) {}
        }
      };
    } catch (_) {}
  }
}

/**
 * Main Application State Controller
 */
export class EntangledLoveApp {
  constructor() {
    this.canvas = document.getElementById('scene-canvas');
    this.renderer = new SceneRenderer(this.canvas);
    this.audio = new AudioManager();

    // State Variables
    this.chapter = 1;
    this.seed = 7;
    this.shots = [];
    this.counts = {};
    this.shotIndex = 0; // Current evening [0..shots.length-1]
    this.stats = null;
    this.statements = [];
    this.userAnswers = {}; // id -> boolean
    this.isNotebookSubmitted = false;
    this.notebookScore = null;
    this.mode = 'simulator'; // 'atlas' or 'simulator'

    // UI Elements
    this.dom = {
      titleModal: document.getElementById('title-modal'),
      btnConnectAtlas: document.getElementById('btn-connect-atlas'),
      btnPlaySimulator: document.getElementById('btn-play-simulator'),
      btnResumeCache: document.getElementById('btn-resume-cache'),
      inputApiKey: document.getElementById('input-api-key'),
      inputEndpoint: document.getElementById('input-endpoint'),
      btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
      statusLog: document.getElementById('status-log'),
      advancedToggle: document.getElementById('advanced-toggle'),
      advancedFields: document.getElementById('advanced-fields'),
      btnSetProxy: document.getElementById('btn-set-proxy'),
      btnSetDirect: document.getElementById('btn-set-direct'),
      
      // Top bar & Evening Controls
      topChapter: document.getElementById('chapter-indicator'),
      topEvening: document.getElementById('evening-indicator'),
      topModeBadge: document.getElementById('mode-badge'),
      btnMute: document.getElementById('btn-mute'),
      btnToggleCurtains: document.getElementById('btn-toggle-curtains'),
      btnRefreshEvening: document.getElementById('btn-refresh-evening'),
      btnOpenNotebook: document.getElementById('btn-open-notebook'),
      eveningProgress: document.getElementById('evening-progress'),
      eveningProgressBar: document.getElementById('evening-progress-bar'),

      // Notebook Panel
      notebookPanel: document.getElementById('notebook-panel'),
      btnCloseNotebook: document.getElementById('btn-close-notebook'),
      statementList: document.getElementById('statement-list'),
      btnSubmitNotebook: document.getElementById('btn-submit-notebook'),
      btnNewChapter: document.getElementById('btn-new-chapter'),
      notebookScoreBanner: document.getElementById('notebook-score-banner'),
      scoreText: document.getElementById('score-text'),
      scoreInsights: document.getElementById('score-insights'),

      // CORS proxy modal
      btnCorsHelp: document.getElementById('btn-cors-help'),
      corsModal: document.getElementById('cors-modal'),
      btnCloseCors: document.getElementById('btn-close-cors')
    };

    this.initEventListeners();
    this.checkCachedSession();
    this.startRenderLoop();
  }

  checkCachedSession() {
    const cachedKey = sessionStorage.getItem(STORAGE_KEY_API_KEY);
    if (cachedKey) {
      this.dom.inputApiKey.value = cachedKey;
    }
    const cachedEndpoint = sessionStorage.getItem(STORAGE_KEY_ENDPOINT);
    if (cachedEndpoint) {
      this.dom.inputEndpoint.value = cachedEndpoint;
    }

    const cachedShotsRaw = sessionStorage.getItem(STORAGE_KEY_SHOTS);
    if (cachedShotsRaw) {
      try {
        const cached = JSON.parse(cachedShotsRaw);
        if (cached && Array.isArray(cached.shots) && cached.shots.length > 0) {
          this.dom.btnResumeCache.classList.remove('hidden');
          this.dom.btnResumeCache.textContent = `Resume Cached Batch (${cached.source === 'atlas' ? 'Atlas' : 'Simulator'}, ${cached.shots.length} shots)`;
        }
      } catch (_) {}
    }
  }

  initEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => this.renderer.resize());

    // Canvas click interaction (toggling curtains A & B)
    this.canvas.addEventListener('click', (e) => {
      this.audio.unlockAudioContext();
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      if (hit === 'A' || hit === 'B') {
        const isNowOpen = this.renderer.toggleCurtain(hit);
        this.audio.playCurtainSwipe();
        this.syncAudioState();
        this.updateCurtainsButtonLabel();
      }
    });

    // Canvas hover feedback
    this.canvas.addEventListener('mousemove', (e) => {
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      this.renderer.hoverWindow = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.hoverWindow = null;
      this.canvas.style.cursor = 'default';
    });

    // API Key visibility toggle
    this.dom.btnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = this.dom.inputApiKey.type === 'password';
      this.dom.inputApiKey.type = isPass ? 'text' : 'password';
      this.dom.btnToggleKeyVisibility.textContent = isPass ? 'Hide' : 'Show';
    });

    // Advanced fields toggle
    this.dom.advancedToggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.dom.advancedFields.classList.toggle('hidden');
    });

    // Connect to Atlas API
    this.dom.btnConnectAtlas.addEventListener('click', () => this.startWithAtlas());

    // Play in Local Simulator Mode (No API key needed)
    this.dom.btnPlaySimulator.addEventListener('click', () => this.startWithSimulator());

    // Resume Cached Batch
    this.dom.btnResumeCache.addEventListener('click', () => this.resumeCachedBatch());

    // Audio Mute Toggle
    this.dom.btnMute.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.dom.btnMute.textContent = isMuted ? 'Audio: Muted' : 'Audio: On';
      this.dom.btnMute.classList.toggle('muted', isMuted);
    });

    // Button: Toggle Both Curtains
    this.dom.btnToggleCurtains.addEventListener('click', () => {
      this.audio.unlockAudioContext();
      const bothOpen = this.renderer.targetCurtainA > 0.5 && this.renderer.targetCurtainB > 0.5;
      const nextState = !bothOpen;
      this.renderer.setCurtains(nextState, nextState);
      this.audio.playCurtainSwipe();
      this.syncAudioState();
      this.updateCurtainsButtonLabel();
    });

    // Button: Refresh (Take next shot from batch, close curtains, no API call!)
    this.dom.btnRefreshEvening.addEventListener('click', () => this.nextEvening());

    // Button: Open/Close Notebook
    this.dom.btnOpenNotebook.addEventListener('click', () => {
      this.dom.notebookPanel.classList.toggle('hidden');
    });
    this.dom.btnCloseNotebook.addEventListener('click', () => {
      this.dom.notebookPanel.classList.add('hidden');
    });

    // Notebook submission
    this.dom.btnSubmitNotebook.addEventListener('click', () => this.submitNotebook());

    // New Chapter Button
    this.dom.btnNewChapter.addEventListener('click', () => this.startNewChapter());

    // CORS Help Modal
    this.dom.btnCorsHelp.addEventListener('click', (e) => {
      e.preventDefault();
      this.dom.corsModal.classList.remove('hidden');
    });
    this.dom.btnCloseCors.addEventListener('click', () => {
      this.dom.corsModal.classList.add('hidden');
    });

    // Preset Base URL buttons (Proxy vs Direct)
    if (this.dom.btnSetProxy) {
      this.dom.btnSetProxy.addEventListener('click', () => {
        this.dom.inputEndpoint.value = 'http://localhost:8787/api/v1';
        try { sessionStorage.setItem(STORAGE_KEY_ENDPOINT, 'http://localhost:8787/api/v1'); } catch (_) {}
        this.logStatus('Base URL switched to local proxy: http://localhost:8787/api/v1');
      });
    }

    if (this.dom.btnSetDirect) {
      this.dom.btnSetDirect.addEventListener('click', () => {
        this.dom.inputEndpoint.value = ATLAS_DEFAULT_BASE_URL;
        try { sessionStorage.setItem(STORAGE_KEY_ENDPOINT, ATLAS_DEFAULT_BASE_URL); } catch (_) {}
        this.logStatus('Base URL switched to direct: ' + ATLAS_DEFAULT_BASE_URL);
      });
    }
  }

  updateCurtainsButtonLabel() {
    const bothOpen = this.renderer.targetCurtainA > 0.5 && this.renderer.targetCurtainB > 0.5;
    this.dom.btnToggleCurtains.textContent = bothOpen ? 'Close Both Curtains' : 'Peek / Open Both';
  }

  syncAudioState() {
    const isOpenA = this.renderer.targetCurtainA > 0.5;
    const isOpenB = this.renderer.targetCurtainB > 0.5;
    this.audio.updateActivityLoops(
      isOpenA,
      this.renderer.activityA,
      isOpenB,
      this.renderer.activityB
    );
  }

  logStatus(msg, isError = false) {
    this.dom.statusLog.textContent = msg;
    this.dom.statusLog.className = isError ? 'status-log error' : 'status-log active';
  }

  /**
   * Start with Moth Atlas API
   */
  async startWithAtlas() {
    const apiKey = this.dom.inputApiKey.value.trim();
    if (!apiKey) {
      this.logStatus('Please paste your Moth Atlas API key or select Simulator Mode.', true);
      this.dom.inputApiKey.focus();
      return;
    }

    const endpoint = this.dom.inputEndpoint.value.trim() || ATLAS_DEFAULT_BASE_URL;

    // Save strictly to sessionStorage (never disk or repo)
    try {
      sessionStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      sessionStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
    } catch (_) {}

    this.dom.btnConnectAtlas.disabled = true;
    this.dom.btnPlaySimulator.disabled = true;
    this.logStatus('Connecting to Atlas API and preparing graph-v1 job...');

    const client = new AtlasClient(apiKey, endpoint);

    try {
      const batchData = await client.fetchBatch(this.seed, (statusText) => {
        this.logStatus(statusText);
      });

      this.mode = 'atlas';
      this.loadBatch(batchData);
      this.dom.titleModal.classList.add('hidden');
    } catch (err) {
      console.error('Atlas API Error:', err);
      let errMsg = err.message || 'Unknown API error';

      if (errMsg.includes('CORS') || errMsg.includes('Network')) {
        // Direct browser call was blocked by CORS.
        // Check if local proxy is active on http://localhost:8787/api/v1
        this.logStatus('Browser CORS policy blocked direct connection. Checking local proxy on http://localhost:8787...');
        try {
          const testProxy = await fetch('http://localhost:8787/api/v1/engines', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (testProxy.ok) {
            this.logStatus('Local CORS Proxy detected! Automatically switching to http://localhost:8787/api/v1 and retrying...');
            this.dom.inputEndpoint.value = 'http://localhost:8787/api/v1';
            try { sessionStorage.setItem(STORAGE_KEY_ENDPOINT, 'http://localhost:8787/api/v1'); } catch (_) {}
            
            const proxyClient = new AtlasClient(apiKey, 'http://localhost:8787/api/v1');
            const batchData = await proxyClient.fetchBatch(this.seed, (statusText) => {
              this.logStatus(statusText);
            });
            this.mode = 'atlas';
            this.loadBatch(batchData);
            this.dom.titleModal.classList.add('hidden');
            return;
          }
        } catch (_) {
          // Proxy not running
        }

        errMsg = 'Browser CORS blocked direct API access. Run "python3 proxy.py" in terminal or click "Use Local Proxy" above, or switch to Simulator Mode.';
      }

      this.logStatus(errMsg, true);
      this.dom.btnConnectAtlas.disabled = false;
      this.dom.btnPlaySimulator.disabled = false;
    }
  }

  /**
   * Start with Offline Local Quantum Simulator
   */
  startWithSimulator() {
    this.logStatus('Running offline quantum graph-state simulator (1024 shots)...');
    const batchData = simulateLocalGraphBatch(this.seed, 1024, 0.85);

    try {
      sessionStorage.setItem(STORAGE_KEY_SHOTS, JSON.stringify(batchData));
    } catch (_) {}

    this.mode = 'simulator';
    this.loadBatch(batchData);
    this.dom.titleModal.classList.add('hidden');
  }

  /**
   * Resume Cached Batch from sessionStorage
   */
  resumeCachedBatch() {
    const cachedRaw = sessionStorage.getItem(STORAGE_KEY_SHOTS);
    if (!cachedRaw) return;
    try {
      const batchData = JSON.parse(cachedRaw);
      this.mode = batchData.source === 'atlas' ? 'atlas' : 'simulator';
      this.loadBatch(batchData);
      this.dom.titleModal.classList.add('hidden');
    } catch (err) {
      this.logStatus('Failed to restore cached batch: ' + err.message, true);
    }
  }

  /**
   * Load batch of 1024 shots, compute statistics, generate statements
   */
  loadBatch(batchData) {
    this.shots = batchData.shots;
    this.counts = batchData.counts;
    this.seed = batchData.seed || 7;
    this.shotIndex = 0;

    console.log(`[Batch Loaded] ${this.shots.length} shots. Mode: ${this.mode}. Seed: ${this.seed}`);

    // Compute ground-truth empirical statistics from the 1024 shots
    this.stats = computeStatistics(this.shots);

    // Generate the 8 correlation statements scored against this histogram
    this.statements = generateStatementList(this.stats, this.seed);
    this.userAnswers = {};
    this.isNotebookSubmitted = false;
    this.notebookScore = null;

    // Reset UI
    this.renderNotebookStatements();
    this.dom.notebookScoreBanner.classList.add('hidden');
    this.dom.btnSubmitNotebook.disabled = false;
    this.dom.btnSubmitNotebook.textContent = 'Submit Notebook';

    // Update Header Badges
    this.dom.topChapter.textContent = `Chapter ${this.chapter}`;
    this.dom.topModeBadge.textContent = this.mode === 'atlas'
      ? `Moth Atlas (Job: ${batchData.jobId || 'graph-v1'})`
      : 'Local Quantum Simulator';
    this.dom.topModeBadge.className = `mode-badge ${this.mode}`;

    // Apply first evening
    this.applyEvening(0);
  }

  /**
   * Advance to the next unused shot from the batch.
   * Both curtains close.
   * This is a new evening, NOT a new API job.
   */
  nextEvening() {
    if (this.shots.length === 0) return;

    // Advance evening index
    this.shotIndex = (this.shotIndex + 1) % this.shots.length;

    // Smoothly close both curtains for the new evening
    this.renderer.setCurtains(false, false);
    this.audio.playCurtainSwipe();
    this.audio.stopAllLoops();
    this.updateCurtainsButtonLabel();

    // Apply the new evening's activities under the closed curtains
    this.applyEvening(this.shotIndex);
  }

  /**
   * Apply shot at current index to Room A and Room B
   */
  applyEvening(index) {
    const shot = this.shots[index];
    if (!shot) return;

    // Window A reads b0 b1
    const actA = parseInt(shot.slice(0, 2), 2);
    // Window B reads b2 b3
    const actB = parseInt(shot.slice(2, 4), 2);

    this.renderer.setActivities(actA, actB);
    this.syncAudioState();

    // Update UI evening counter and progress
    const currentNum = index + 1;
    const totalNum = this.shots.length;
    this.dom.topEvening.textContent = `Evening ${currentNum} of ${totalNum}`;
    this.dom.eveningProgress.textContent = `${currentNum} / ${totalNum}`;
    const pct = (currentNum / totalNum) * 100;
    this.dom.eveningProgressBar.style.width = `${pct}%`;
  }

  /**
   * Render notebook statement list
   */
  renderNotebookStatements() {
    const container = this.dom.statementList;
    container.innerHTML = '';

    this.statements.forEach((st) => {
      const card = document.createElement('div');
      card.className = 'statement-card';
      card.id = `statement-card-${st.id}`;

      const textEl = document.createElement('p');
      textEl.className = 'statement-text';
      textEl.innerHTML = `<span class="statement-num">${st.id + 1}.</span> ${st.text}`;

      const choiceGroup = document.createElement('div');
      choiceGroup.className = 'choice-group';

      // True Button
      const btnTrue = document.createElement('button');
      btnTrue.type = 'button';
      btnTrue.className = 'choice-btn true-btn';
      btnTrue.textContent = 'True';
      btnTrue.addEventListener('click', () => this.selectAnswer(st.id, true));

      // False Button
      const btnFalse = document.createElement('button');
      btnFalse.type = 'button';
      btnFalse.className = 'choice-btn false-btn';
      btnFalse.textContent = 'False';
      btnFalse.addEventListener('click', () => this.selectAnswer(st.id, false));

      choiceGroup.appendChild(btnTrue);
      choiceGroup.appendChild(btnFalse);

      // Result details container (shown after submit)
      const resultEl = document.createElement('div');
      resultEl.className = 'statement-result hidden';
      resultEl.id = `statement-result-${st.id}`;

      card.appendChild(textEl);
      card.appendChild(choiceGroup);
      card.appendChild(resultEl);
      container.appendChild(card);
    });
  }

  selectAnswer(statementId, value) {
    if (this.isNotebookSubmitted) return;

    this.userAnswers[statementId] = value;
    const card = document.getElementById(`statement-card-${statementId}`);
    if (!card) return;

    const btnTrue = card.querySelector('.true-btn');
    const btnFalse = card.querySelector('.false-btn');

    if (value === true) {
      btnTrue.classList.add('selected');
      btnFalse.classList.remove('selected');
    } else {
      btnFalse.classList.add('selected');
      btnTrue.classList.remove('selected');
    }
  }

  /**
   * Submit notebook and score against the empirical histogram
   */
  submitNotebook() {
    // Check if all 8 questions answered
    const answeredCount = Object.keys(this.userAnswers).length;
    if (answeredCount < this.statements.length) {
      alert(`Please answer all ${this.statements.length} correlation statements before submitting. (${answeredCount}/${this.statements.length} answered)`);
      return;
    }

    const scoring = scoreNotebook(this.statements, this.userAnswers);
    this.notebookScore = scoring;
    this.isNotebookSubmitted = true;

    // Display score banner
    this.dom.notebookScoreBanner.classList.remove('hidden');
    this.dom.scoreText.textContent = `${scoring.score} / ${scoring.total} Correct (${scoring.percentage}%)`;

    let insightMsg = '';
    if (scoring.score === 8) {
      insightMsg = 'Flawless intuition! You have deciphered the quantum graph state: qubits 0 and 2 are strongly entangled, keeping resting and active states synchronized, while qubits 1 and 3 remain uncorrelated coin flips.';
    } else if (scoring.score >= 6) {
      insightMsg = 'Great observational acuity! You picked up on the primary correlation between person A and person B. Notice how individual activities split 50/50 among correlated pairs.';
    } else {
      insightMsg = 'Quantum correlation can be subtle. Review the measured percentages below to see how the graph state prepared by the engine behaved.';
    }
    this.dom.scoreInsights.textContent = insightMsg;

    // Update each statement card with measured percentage and explanation
    scoring.results.forEach((res) => {
      const card = document.getElementById(`statement-card-${res.id}`);
      const resultEl = document.getElementById(`statement-result-${res.id}`);
      if (!card || !resultEl) return;

      card.classList.add(res.isCorrect ? 'card-correct' : 'card-incorrect');

      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div class="result-badge ${res.isCorrect ? 'badge-correct' : 'badge-incorrect'}">
          ${res.isCorrect ? '✓ Correct' : '✗ Incorrect'} (Ground Truth: ${res.groundTruth ? 'TRUE' : 'FALSE'})
        </div>
        <div class="result-measured"><strong>Empirical Histogram:</strong> ${res.measuredText}</div>
        <div class="result-explanation">${res.explanation}</div>
      `;
    });

    this.dom.btnSubmitNotebook.disabled = true;
    this.dom.btnSubmitNotebook.textContent = 'Notebook Submitted';
    this.dom.notebookScoreBanner.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Start New Chapter: spends one more job with a new seed
   */
  async startNewChapter() {
    const nextSeed = (this.seed * 31 + 17) % 9999 + 1;
    this.chapter += 1;
    this.seed = nextSeed;

    if (this.mode === 'atlas') {
      const confirmSpend = confirm(`Start Chapter ${this.chapter}? This will submit a new 1024-shot job to the Moth Atlas graph-v1 engine (5 credits, seed: ${this.seed}). Proceed?`);
      if (!confirmSpend) return;

      const apiKey = sessionStorage.getItem(STORAGE_KEY_API_KEY) || this.dom.inputApiKey.value.trim();
      const endpoint = sessionStorage.getItem(STORAGE_KEY_ENDPOINT) || ATLAS_DEFAULT_BASE_URL;
      const client = new AtlasClient(apiKey, endpoint);

      this.dom.notebookPanel.classList.add('hidden');
      this.dom.titleModal.classList.remove('hidden');
      this.dom.btnConnectAtlas.disabled = true;
      this.dom.btnPlaySimulator.disabled = true;

      try {
        const batchData = await client.fetchBatch(this.seed, (statusText) => {
          this.logStatus(statusText);
        });
        this.loadBatch(batchData);
        this.dom.titleModal.classList.add('hidden');
      } catch (err) {
        this.logStatus(`Chapter ${this.chapter} failed: ${err.message}`, true);
        this.dom.btnConnectAtlas.disabled = false;
        this.dom.btnPlaySimulator.disabled = false;
      }
    } else {
      // Simulator mode
      this.startWithSimulator();
      this.dom.notebookPanel.classList.add('hidden');
    }
  }

  /**
   * Main Animation & Render Loop
   */
  startRenderLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      this.renderer.update(dt);
      this.renderer.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new EntangledLoveApp();
});
