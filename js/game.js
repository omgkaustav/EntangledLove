/**
 * game.js - Core State Controller, Audio Manager, and Diegetic Interaction Engine
 * 
 * Features:
 * - Observational quantum game across London (Leo) & Tokyo (Mia)
 * - 4-qubit graph state prepared by Moth Atlas graph-v1 engine (or local simulation)
 * - Diegetic Field Notebook with pencil tick [✓] and cross [✗] marks
 * - Unlimited days of observation: player advances at their own pace and submits when confident
 * - Day counter and time-lapse celestial transition
 * - Tactile light switches: keyboard shortcuts [Z] Leo, [X] Mia, [C] Both, [N] Next Evening
 * - Ambient room audio loops and WebAudio synth fallbacks
 * - Zero build step, vanilla ES modules
 */

import {
  AtlasClient,
  simulateLocalGraphBatch,
  STORAGE_KEY_API_KEY,
  STORAGE_KEY_ENDPOINT,
  STORAGE_KEY_SHOTS,
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
 * Audio Manager: tactile light switches, pencil graphite scribbles, celestial transitions, and ambient room loops
 */
class AudioManager {
  constructor() {
    this.isMuted = false;
    this.audioContext = null;
    this.audioUnlocked = false;

    // HTML5 Audio Elements
    this.soundFiles = {
      click: 'assets/audio/switch_click.wav',
      pencil: 'assets/audio/pencil_check.wav',
      swipe: 'assets/audio/curtain_swipe.wav',
      bed: 'assets/audio/bed_tone.wav',
      thinking: 'assets/audio/thinking_loop.wav',
      gaming: 'assets/audio/game_clicks.wav',
      cooking: 'assets/audio/simmer_loop.wav'
    };

    this.audioElements = {};
    this.initAudioElements();

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
      if (key !== 'click' && key !== 'pencil' && key !== 'swipe') {
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
    } catch (_) {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAllLoops();
    }
    return this.isMuted;
  }

  playLightSwitch() {
    if (this.isMuted) return;
    this.unlockAudioContext();
    const click = this.audioElements.click;
    if (click) {
      click.volume = 0.35;
      click.currentTime = 0;
      click.play().catch(() => this.synthSwitchClick());
    } else {
      this.synthSwitchClick();
    }
  }

  playPencilCheck() {
    if (this.isMuted) return;
    this.unlockAudioContext();
    const pencil = this.audioElements.pencil;
    if (pencil) {
      pencil.volume = 0.45;
      pencil.currentTime = 0;
      pencil.play().catch(() => this.synthPencilScratch());
    } else {
      this.synthPencilScratch();
    }
  }

  playDayTransition() {
    if (this.isMuted) return;
    this.unlockAudioContext();
    try {
      const ctx = this.audioContext;
      if (!ctx) return;
      // Celestial harmonic chord (C5, E5, G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + 0.7);
      });
    } catch (_) {}
  }

  updateActivityLoops(isLitA, actA, isLitB, actB) {
    if (this.isMuted) {
      this.stopAllLoops();
      return;
    }
    this.unlockAudioContext();

    const actKeys = ['bed', 'thinking', 'gaming', 'cooking'];

    // Room A Audio Loop (plays only while Light A is ON)
    if (isLitA) {
      this.playRoomAudio('A', actKeys[actA], actA);
    } else {
      this.stopRoomAudio('A');
    }

    // Room B Audio Loop (plays only while Light B is ON)
    if (isLitB) {
      this.playRoomAudio('B', actKeys[actB], actB);
    } else {
      this.stopRoomAudio('B');
    }
  }

  playRoomAudio(roomKey, soundKey, actCode) {
    const audio = this.audioElements[soundKey];
    if (audio) {
      audio.volume = 0.22;
      if (audio.paused) {
        audio.play().catch(() => this.synthActivityLoop(roomKey, actCode));
      }
    } else {
      this.synthActivityLoop(roomKey, actCode);
    }
  }

  stopRoomAudio(roomKey) {
    if (this.activeSynthLoops[roomKey]) {
      try { this.activeSynthLoops[roomKey].stop(); } catch (_) {}
      this.activeSynthLoops[roomKey] = null;
    }
  }

  stopAllLoops() {
    for (const [key, audio] of Object.entries(this.audioElements)) {
      if (key !== 'click' && key !== 'pencil' && key !== 'swipe') {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
      }
    }
    this.stopRoomAudio('A');
    this.stopRoomAudio('B');
  }

  synthSwitchClick() {
    if (!this.audioContext || this.isMuted) return;
    try {
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  synthPencilScratch() {
    if (!this.audioContext || this.isMuted) return;
    try {
      const ctx = this.audioContext;
      const bufferSize = Math.floor(ctx.sampleRate * 0.07);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, ctx.currentTime);
      filter.Q.setValueAtTime(2.5, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (_) {}
  }

  synthActivityLoop(roomKey, actCode) {
    if (!this.audioContext || this.isMuted) return;
    if (this.activeSynthLoops[roomKey]) return;
    try {
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (actCode === 0) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
      } else if (actCode === 1) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(432, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
      } else if (actCode === 2) {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
      } else {
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

    // Game state
    this.journey = 1;
    this.seed = 7;
    this.shots = [];
    this.dayIndex = 0; // 0 to this.shots.length - 1 (NO hard cap!)
    this.stats = null;
    this.statements = [];
    this.userAnswers = {};
    this.isSubmitted = false;
    this.mode = 'simulator';

    // UI Element References
    this.dom = {
      // HUD
      dayIndicator: document.getElementById('day-indicator'),
      modeBadge: document.getElementById('mode-badge'),
      btnAudioToggle: document.getElementById('btn-audio-toggle'),
      btnSettings: document.getElementById('btn-settings'),
      btnGuide: document.getElementById('btn-guide'),

      // Canvas Floating Controls
      btnLightA: document.getElementById('btn-light-a'),
      btnLightB: document.getElementById('btn-light-b'),
      btnLightBoth: document.getElementById('btn-light-both'),
      btnNextDay: document.getElementById('btn-next-day'),

      // Diegetic Field Notebook
      journalDayTally: document.getElementById('journal-day-tally'),
      scoreBanner: document.getElementById('score-banner'),
      stampSealBadge: document.getElementById('stamp-seal-badge'),
      scoreNumber: document.getElementById('score-number'),
      scoreDaysLabel: document.getElementById('score-days-label'),
      scoreInsight: document.getElementById('score-insight'),
      checklistCards: document.getElementById('checklist-cards'),
      btnSubmitChecklist: document.getElementById('btn-submit-checklist'),
      btnNewJourney: document.getElementById('btn-new-journey'),

      // Settings Modal
      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      inputApiKey: document.getElementById('input-api-key'),
      inputEndpoint: document.getElementById('input-endpoint'),
      btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
      advancedToggle: document.getElementById('advanced-toggle'),
      advancedFields: document.getElementById('advanced-fields'),
      btnSetProxy: document.getElementById('btn-set-proxy'),
      btnSetDirect: document.getElementById('btn-set-direct'),
      statusLog: document.getElementById('status-log'),
      btnConnectAtlas: document.getElementById('btn-connect-atlas'),
      btnPlaySimulator: document.getElementById('btn-play-simulator'),
      btnResumeCache: document.getElementById('btn-resume-cache'),
      btnCorsHelp: document.getElementById('btn-cors-help'),

      // Guide Modal
      guideModal: document.getElementById('guide-modal'),
      btnCloseGuide: document.getElementById('btn-close-guide'),
      btnGuideGotit: document.getElementById('btn-guide-gotit'),

      // CORS Modal
      corsModal: document.getElementById('cors-modal'),
      btnCloseCors: document.getElementById('btn-close-cors'),
      btnCloseCorsFooter: document.getElementById('btn-close-cors-footer')
    };

    this.initEventListeners();
    this.initKeyboardBindings();
    this.autoBootstrapGame();
    this.startRenderLoop();
  }

  autoBootstrapGame() {
    // Check cached credentials
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
          this.mode = cached.source === 'atlas' ? 'atlas' : 'simulator';
          this.loadBatch(cached);
          return;
        }
      } catch (_) {}
    }

    // Default to instant play via Local Quantum Simulator
    this.startWithSimulator();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.renderer.resize());

    // Canvas click interaction: toggles light in Window A or B
    this.canvas.addEventListener('click', (e) => {
      this.audio.unlockAudioContext();
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      if (hit === 'A' || hit === 'B') {
        this.toggleWindowLight(hit);
      }
    });

    // Canvas mouse move hover cursor
    this.canvas.addEventListener('mousemove', (e) => {
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      this.renderer.hoverWindow = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.hoverWindow = null;
      this.canvas.style.cursor = 'default';
    });

    // Floating toolbar buttons
    this.dom.btnLightA.addEventListener('click', () => this.toggleWindowLight('A'));
    this.dom.btnLightB.addEventListener('click', () => this.toggleWindowLight('B'));
    this.dom.btnLightBoth.addEventListener('click', () => this.toggleBothLights());
    this.dom.btnNextDay.addEventListener('click', () => this.nextDay());

    // Audio toggle
    this.dom.btnAudioToggle.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.dom.btnAudioToggle.textContent = isMuted ? '🔇 Audio: Muted' : '🔊 Audio';
      this.dom.btnAudioToggle.classList.toggle('active', !isMuted);
    });

    // Settings Modal Open/Close
    this.dom.btnSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.remove('hidden');
    });
    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    // Guide Modal Open/Close
    this.dom.btnGuide.addEventListener('click', () => {
      this.dom.guideModal.classList.remove('hidden');
    });
    this.dom.btnCloseGuide.addEventListener('click', () => {
      this.dom.guideModal.classList.add('hidden');
    });
    this.dom.btnGuideGotit.addEventListener('click', () => {
      this.dom.guideModal.classList.add('hidden');
    });

    // CORS Modal Open/Close
    this.dom.btnCorsHelp.addEventListener('click', (e) => {
      e.preventDefault();
      this.dom.corsModal.classList.remove('hidden');
    });
    this.dom.btnCloseCors.addEventListener('click', () => {
      this.dom.corsModal.classList.add('hidden');
    });
    this.dom.btnCloseCorsFooter.addEventListener('click', () => {
      this.dom.corsModal.classList.add('hidden');
    });

    // Settings Modal actions
    this.dom.btnConnectAtlas.addEventListener('click', () => this.startWithAtlas());
    this.dom.btnPlaySimulator.addEventListener('click', () => {
      this.startWithSimulator();
      this.dom.settingsModal.classList.add('hidden');
    });
    this.dom.btnResumeCache.addEventListener('click', () => this.resumeCachedBatch());

    // API Key visibility toggle
    this.dom.btnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = this.dom.inputApiKey.type === 'password';
      this.dom.inputApiKey.type = isPass ? 'text' : 'password';
      this.dom.btnToggleKeyVisibility.textContent = isPass ? 'Hide' : 'Show';
    });

    // Advanced toggle
    this.dom.advancedToggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.dom.advancedFields.classList.toggle('hidden');
    });

    // Proxy preset buttons
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

    // Field Notebook Actions
    this.dom.btnSubmitChecklist.addEventListener('click', () => this.submitNotebook());
    this.dom.btnNewJourney.addEventListener('click', () => this.startNewJourney());
  }

  /**
   * Keyboard shortcuts:
   * Z: Toggle Leo's Light (London)
   * X: Toggle Mia's Light (Tokyo)
   * C: Toggle Both Lights
   * N: Next Evening
   */
  initKeyboardBindings() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        this.toggleWindowLight('A');
      } else if (key === 'x') {
        e.preventDefault();
        this.toggleWindowLight('B');
      } else if (key === 'c') {
        e.preventDefault();
        this.toggleBothLights();
      } else if (key === 'n') {
        e.preventDefault();
        this.nextDay();
      }
    });
  }

  toggleWindowLight(winKey) {
    this.audio.unlockAudioContext();
    this.renderer.toggleLight(winKey);
    this.audio.playLightSwitch();
    this.syncAudioState();
    this.updateControlsUI();
  }

  toggleBothLights() {
    this.audio.unlockAudioContext();
    this.renderer.toggleBothLights();
    this.audio.playLightSwitch();
    this.syncAudioState();
    this.updateControlsUI();
  }

  updateControlsUI() {
    const isLitA = this.renderer.targetLightA > 0.5;
    const isLitB = this.renderer.targetLightB > 0.5;
    const bothLit = isLitA && isLitB;

    this.dom.btnLightA.innerHTML = `<kbd>Z</kbd> Leo's Room (${isLitA ? 'ON' : 'Off'})`;
    this.dom.btnLightA.classList.toggle('active-light', isLitA);

    this.dom.btnLightB.innerHTML = `<kbd>X</kbd> Mia's Room (${isLitB ? 'ON' : 'Off'})`;
    this.dom.btnLightB.classList.toggle('active-light', isLitB);

    this.dom.btnLightBoth.innerHTML = `<kbd>C</kbd> ${bothLit ? 'Turn Both Off' : 'Turn Both On'}`;
  }

  syncAudioState() {
    const isLitA = this.renderer.targetLightA > 0.5;
    const isLitB = this.renderer.targetLightB > 0.5;
    this.audio.updateActivityLoops(
      isLitA,
      this.renderer.activityA,
      isLitB,
      this.renderer.activityB
    );
  }

  logStatus(msg, isError = false) {
    this.dom.statusLog.textContent = msg;
    this.dom.statusLog.className = isError ? 'status-console error' : 'status-console active';
  }

  /**
   * Start or Switch to Moth Atlas API
   */
  async startWithAtlas() {
    const apiKey = this.dom.inputApiKey.value.trim();
    if (!apiKey) {
      this.logStatus('Please paste your Moth Atlas API Bearer token, or use the Local Simulator.', true);
      this.dom.inputApiKey.focus();
      return;
    }

    const endpoint = this.dom.inputEndpoint.value.trim() || ATLAS_DEFAULT_BASE_URL;

    try {
      sessionStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      sessionStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
    } catch (_) {}

    this.dom.btnConnectAtlas.disabled = true;
    this.dom.btnPlaySimulator.disabled = true;
    this.logStatus('Submitting 4-qubit graph state job to Moth Atlas (5 credits)...');

    const client = new AtlasClient(apiKey, endpoint);

    try {
      const batchData = await client.fetchBatch(this.seed, (statusText) => {
        this.logStatus(statusText);
      });

      this.mode = 'atlas';
      this.loadBatch(batchData);
      this.dom.settingsModal.classList.add('hidden');
      this.dom.btnConnectAtlas.disabled = false;
      this.dom.btnPlaySimulator.disabled = false;
    } catch (err) {
      console.error('Atlas API Error:', err);
      let errMsg = err.message || 'Unknown API error';

      if (errMsg.includes('CORS') || errMsg.includes('Network')) {
        this.logStatus('Browser CORS policy detected. Testing local proxy on http://localhost:8787...');
        try {
          const testProxy = await fetch('http://localhost:8787/api/v1/engines', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (testProxy.ok) {
            this.logStatus('Local CORS Proxy active! Routing through http://localhost:8787/api/v1...');
            this.dom.inputEndpoint.value = 'http://localhost:8787/api/v1';
            try { sessionStorage.setItem(STORAGE_KEY_ENDPOINT, 'http://localhost:8787/api/v1'); } catch (_) {}
            
            const proxyClient = new AtlasClient(apiKey, 'http://localhost:8787/api/v1');
            const batchData = await proxyClient.fetchBatch(this.seed, (statusText) => {
              this.logStatus(statusText);
            });
            this.mode = 'atlas';
            this.loadBatch(batchData);
            this.dom.settingsModal.classList.add('hidden');
            this.dom.btnConnectAtlas.disabled = false;
            this.dom.btnPlaySimulator.disabled = false;
            return;
          }
        } catch (_) {}

        errMsg = 'Direct browser connection was blocked by CORS. Run "python3 proxy.py" in your terminal, click "Use Local Proxy", or switch to Local Simulator Mode.';
      }

      this.logStatus(errMsg, true);
      this.dom.btnConnectAtlas.disabled = false;
      this.dom.btnPlaySimulator.disabled = false;
    }
  }

  startWithSimulator() {
    this.logStatus('Generating 1,024 shots with Local Quantum Graph Simulator...');
    const batchData = simulateLocalGraphBatch(this.seed, 1024, 0.85);

    try {
      sessionStorage.setItem(STORAGE_KEY_SHOTS, JSON.stringify(batchData));
    } catch (_) {}

    this.mode = 'simulator';
    this.loadBatch(batchData);
  }

  resumeCachedBatch() {
    const cachedRaw = sessionStorage.getItem(STORAGE_KEY_SHOTS);
    if (!cachedRaw) return;
    try {
      const batchData = JSON.parse(cachedRaw);
      this.mode = batchData.source === 'atlas' ? 'atlas' : 'simulator';
      this.loadBatch(batchData);
      this.dom.settingsModal.classList.add('hidden');
    } catch (err) {
      this.logStatus('Failed to restore cached batch: ' + err.message, true);
    }
  }

  loadBatch(batchData) {
    this.shots = batchData.shots;
    this.seed = batchData.seed || 7;
    this.dayIndex = 0;

    // Compute ground truth statistics across the whole batch
    this.stats = computeStatistics(this.shots);
    this.statements = generateStatementList(this.stats, this.seed);
    this.userAnswers = {};
    this.isSubmitted = false;

    // Render Diegetic Notebook
    this.renderChecklist();
    this.dom.scoreBanner.classList.add('hidden');
    this.dom.btnSubmitChecklist.disabled = false;
    this.dom.btnSubmitChecklist.innerHTML = `
      <span class="wax-seal-icon">✦</span>
      <span class="wax-seal-text">SEAL OBSERVATIONS</span>
    `;

    // Update HUD & Badges
    this.dom.modeBadge.textContent = this.mode === 'atlas'
      ? `Moth Atlas (${batchData.jobId ? batchData.jobId.slice(0, 8) : 'graph-v1'})`
      : 'Local Simulator';
    this.dom.modeBadge.className = `mode-badge ${this.mode}`;

    this.applyDay(0);
  }

  /**
   * Advance to the next evening: player can observe as many days as they need!
   */
  nextDay() {
    if (this.shots.length === 0) return;

    if (this.dayIndex + 1 < this.shots.length) {
      this.dayIndex++;
      this.renderer.triggerDayTransition(this.dayIndex + 1);
      this.audio.playDayTransition();
      this.applyDay(this.dayIndex);
      this.updateControlsUI();
    } else {
      alert('You have reached the end of this 1,024-shot batch! Click "New Investigation" to generate another quantum chapter.');
    }
  }

  applyDay(index) {
    const shot = this.shots[index];
    if (!shot) return;

    const actA = parseInt(shot.slice(0, 2), 2);
    const actB = parseInt(shot.slice(2, 4), 2);

    this.renderer.setActivities(actA, actB);
    this.syncAudioState();

    const currentDay = index + 1;
    const formattedDay = currentDay < 10 ? `0${currentDay}` : `${currentDay}`;
    this.dom.dayIndicator.textContent = `EVENING ${formattedDay}`;

    if (!this.isSubmitted) {
      this.dom.journalDayTally.textContent = `Day ${currentDay} • In Progress`;
    }
  }

  /**
   * Render the 5 statements in the Diegetic Field Notebook with authentic pencil checkboxes
   */
  renderChecklist() {
    const container = this.dom.checklistCards;
    container.innerHTML = '';

    this.statements.forEach((st) => {
      const entry = document.createElement('div');
      entry.className = 'journal-entry';
      entry.id = `journal-entry-${st.id}`;

      // Statement text
      const textEl = document.createElement('p');
      textEl.className = 'entry-text';
      textEl.innerHTML = `<span class="entry-num">${st.id + 1}.</span> ${st.text}`;

      // Pencil checkbox buttons
      const checkboxRow = document.createElement('div');
      checkboxRow.className = 'entry-checkboxes';

      // True Option
      const btnTrue = document.createElement('button');
      btnTrue.type = 'button';
      btnTrue.className = 'pencil-box-btn true-btn';
      btnTrue.innerHTML = `
        <span class="pencil-square">✓</span>
        <span>True</span>
      `;
      btnTrue.addEventListener('click', () => this.selectAnswer(st.id, true));

      // False Option
      const btnFalse = document.createElement('button');
      btnFalse.type = 'button';
      btnFalse.className = 'pencil-box-btn false-btn';
      btnFalse.innerHTML = `
        <span class="pencil-square">✗</span>
        <span>False</span>
      `;
      btnFalse.addEventListener('click', () => this.selectAnswer(st.id, false));

      checkboxRow.appendChild(btnTrue);
      checkboxRow.appendChild(btnFalse);

      // Result annotation container (revealed upon submit)
      const resultEl = document.createElement('div');
      resultEl.className = 'entry-result hidden';
      resultEl.id = `entry-result-${st.id}`;

      entry.appendChild(textEl);
      entry.appendChild(checkboxRow);
      entry.appendChild(resultEl);
      container.appendChild(entry);
    });
  }

  selectAnswer(statementId, value) {
    if (this.isSubmitted) return;

    this.userAnswers[statementId] = value;
    this.audio.playPencilCheck();

    const entry = document.getElementById(`journal-entry-${statementId}`);
    if (!entry) return;

    const btnTrue = entry.querySelector('.true-btn');
    const btnFalse = entry.querySelector('.false-btn');

    if (value === true) {
      btnTrue.classList.add('selected');
      btnFalse.classList.remove('selected');
    } else {
      btnFalse.classList.add('selected');
      btnTrue.classList.remove('selected');
    }
  }

  /**
   * Submit and stamp deductions in the notebook
   */
  submitNotebook() {
    if (this.isSubmitted) return;

    const answeredCount = Object.keys(this.userAnswers).length;
    if (answeredCount < this.statements.length) {
      const confirmEarly = confirm(
        `You have filled ${answeredCount} of ${this.statements.length} observations in your logbook. Seal your deductions now?`
      );
      if (!confirmEarly) return;
    }

    const scoring = scoreNotebook(this.statements, this.userAnswers);
    this.isSubmitted = true;
    const submittedOnDay = this.dayIndex + 1;

    // Reveal verdict stamp banner in notebook
    this.dom.scoreBanner.classList.remove('hidden');
    this.dom.scoreNumber.textContent = `${scoring.score} / ${scoring.total} Correct (${scoring.percentage}%)`;
    this.dom.scoreDaysLabel.textContent = `Deductions sealed on Day ${submittedOnDay} of observations`;
    this.dom.journalDayTally.textContent = `Day ${submittedOnDay} • Sealed`;

    // Rubber stamp appearance
    const isMaster = scoring.score >= 4;
    this.dom.stampSealBadge.textContent = isMaster ? 'CONFIRMED' : 'INCONCLUSIVE';
    this.dom.stampSealBadge.className = isMaster ? 'stamp-seal-badge' : 'stamp-seal-badge imperfect';

    let narrative = '';
    if (scoring.score === 5) {
      narrative = 'Flawless deduction! You unveiled the quantum bond: Leo and Mia are correlated by an entangled graph state on qubits 0 & 2, linking their resting and active cycles across 9,560 km.';
    } else if (scoring.score >= 3) {
      narrative = 'Strong observational insight! You detected the core rule: when one rests, the other tends to rest; when one is active, the other is active.';
    } else {
      narrative = 'Quantum superpositions can deceive the eye. Read the inked notes below to see how Leo and Mia were secretly entangled.';
    }
    this.dom.scoreInsight.textContent = narrative;

    // Apply stamps and red pen annotations to each entry
    scoring.results.forEach((res) => {
      const entry = document.getElementById(`journal-entry-${res.id}`);
      const resultEl = document.getElementById(`entry-result-${res.id}`);
      if (!entry || !resultEl) return;

      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div class="rubber-stamp-tag ${res.isCorrect ? 'correct' : 'incorrect'}">
          ${res.isCorrect ? '✓ [VERIFIED]' : '✗ [REFUTED]'} — Ground Truth: ${res.groundTruth ? 'TRUE' : 'FALSE'}
        </div>
        <div class="entry-margin-annotation">↳ ${res.explanation}</div>
      `;
    });

    this.dom.btnSubmitChecklist.disabled = true;
    this.dom.btnSubmitChecklist.innerHTML = `
      <span class="wax-seal-icon">✓</span>
      <span class="wax-seal-text">DEDUCTIONS SEALED</span>
    `;
  }

  startNewJourney() {
    this.journey += 1;
    this.seed = (this.seed * 31 + 17) % 9999 + 1;
    this.dayIndex = 0;

    if (this.mode === 'simulator') {
      this.startWithSimulator();
    } else {
      this.startWithAtlas();
    }
  }

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

window.addEventListener('DOMContentLoaded', () => {
  window.app = new EntangledLoveApp();
});
