/**
 * game.js - Core State Controller, Audio Manager, and Interaction Engine
 * 
 * Features:
 * - 16-Day Journey through the 4-qubit quantum graph state
 * - Light switch window mechanic (no curtains)
 * - Keybindings: [Z] Window A, [X] Window B, [C] Both Windows, [N] Next Day
 * - Day-transition celestial animation
 * - Simplified 5-item qualitative checklist with automatic evaluation after 16 days
 * - Integrated single-screen layout (no vertical scrolling)
 * - Audio manager with switch clicks, activity loops, and WebAudio fallback
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

export const MAX_DAYS = 16;

/**
 * Audio Manager: handles tactile light switches, ambient room loops, and day transitions
 */
class AudioManager {
  constructor() {
    this.isMuted = false;
    this.audioContext = null;
    this.audioUnlocked = false;

    // HTML5 Audio Elements
    this.soundFiles = {
      click: 'assets/audio/switch_click.wav',
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
      if (key !== 'click' && key !== 'swipe') {
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

  playDayTransition() {
    if (this.isMuted) return;
    this.unlockAudioContext();
    try {
      const ctx = this.audioContext;
      if (!ctx) return;
      // Celestial harmonic chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.07, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
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
      if (key !== 'click' && key !== 'swipe') {
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
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
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
    this.dayIndex = 0; // 0 to MAX_DAYS - 1 (16 days total)
    this.stats = null;
    this.statements = [];
    this.userAnswers = {};
    this.isSubmitted = false;
    this.mode = 'simulator';

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

      // Header Badges
      topJourney: document.getElementById('journey-indicator'),
      topDay: document.getElementById('day-indicator'),
      topModeBadge: document.getElementById('mode-badge'),
      btnMute: document.getElementById('btn-mute'),

      // Canvas Hotkey Action Buttons
      btnLightA: document.getElementById('btn-light-a'),
      btnLightB: document.getElementById('btn-light-b'),
      btnLightBoth: document.getElementById('btn-light-both'),
      btnNextDay: document.getElementById('btn-next-day'),
      dayProgressBar: document.getElementById('day-progress-bar'),

      // Checklist Panel (Integrated side panel - no scroll down!)
      checklistCards: document.getElementById('checklist-cards'),
      btnSubmitChecklist: document.getElementById('btn-submit-checklist'),
      btnNewJourney: document.getElementById('btn-new-journey'),
      scoreBanner: document.getElementById('score-banner'),
      scoreNumber: document.getElementById('score-number'),
      scoreInsight: document.getElementById('score-insight'),

      // CORS Modal
      btnCorsHelp: document.getElementById('btn-cors-help'),
      corsModal: document.getElementById('cors-modal'),
      btnCloseCors: document.getElementById('btn-close-cors')
    };

    this.initEventListeners();
    this.initKeyboardBindings();
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
    window.addEventListener('resize', () => this.renderer.resize());

    // Canvas click interaction: toggles light in Window A or B
    this.canvas.addEventListener('click', (e) => {
      this.audio.unlockAudioContext();
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      if (hit === 'A' || hit === 'B') {
        this.toggleWindowLight(hit);
      }
    });

    // Canvas mouse move hover
    this.canvas.addEventListener('mousemove', (e) => {
      const hit = this.renderer.hitTest(e.clientX, e.clientY);
      this.renderer.hoverWindow = hit;
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.renderer.hoverWindow = null;
      this.canvas.style.cursor = 'default';
    });

    // Toolbar buttons
    this.dom.btnLightA.addEventListener('click', () => this.toggleWindowLight('A'));
    this.dom.btnLightB.addEventListener('click', () => this.toggleWindowLight('B'));
    this.dom.btnLightBoth.addEventListener('click', () => this.toggleBothLights());
    this.dom.btnNextDay.addEventListener('click', () => this.nextDay());

    // Mute button
    this.dom.btnMute.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.dom.btnMute.textContent = isMuted ? 'Audio: Muted' : 'Audio: On';
      this.dom.btnMute.classList.toggle('muted', isMuted);
    });

    // Title modal buttons
    this.dom.btnConnectAtlas.addEventListener('click', () => this.startWithAtlas());
    this.dom.btnPlaySimulator.addEventListener('click', () => this.startWithSimulator());
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

    // Checklist buttons
    this.dom.btnSubmitChecklist.addEventListener('click', () => this.submitNotebook(false));
    this.dom.btnNewJourney.addEventListener('click', () => this.startNewJourney());

    // CORS help modal
    this.dom.btnCorsHelp.addEventListener('click', (e) => {
      e.preventDefault();
      this.dom.corsModal.classList.remove('hidden');
    });
    this.dom.btnCloseCors.addEventListener('click', () => {
      this.dom.corsModal.classList.add('hidden');
    });
  }

  /**
   * Keyboard shortcuts:
   * Z: Toggle Window A Light
   * X: Toggle Window B Light
   * C: Toggle Both Lights
   * N: Next Day
   */
  initKeyboardBindings() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in an input
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
    const isNowOn = this.renderer.toggleLight(winKey);
    this.audio.playLightSwitch();
    this.syncAudioState();
    this.updateToolbarLabels();
  }

  toggleBothLights() {
    this.audio.unlockAudioContext();
    const isNowOn = this.renderer.toggleBothLights();
    this.audio.playLightSwitch();
    this.syncAudioState();
    this.updateToolbarLabels();
  }

  updateToolbarLabels() {
    const isLitA = this.renderer.targetLightA > 0.5;
    const isLitB = this.renderer.targetLightB > 0.5;
    const bothLit = isLitA && isLitB;

    this.dom.btnLightA.textContent = isLitA ? '[Z] Light A (ON)' : '[Z] Light A (OFF)';
    this.dom.btnLightA.classList.toggle('active-light', isLitA);

    this.dom.btnLightB.textContent = isLitB ? '[X] Light B (ON)' : '[X] Light B (OFF)';
    this.dom.btnLightB.classList.toggle('active-light', isLitB);

    this.dom.btnLightBoth.textContent = bothLit ? '[C] Turn Both Off' : '[C] Turn Both On';
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

    try {
      sessionStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      sessionStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
    } catch (_) {}

    this.dom.btnConnectAtlas.disabled = true;
    this.dom.btnPlaySimulator.disabled = true;
    this.logStatus('Connecting to Moth Atlas graph-v1 engine (5 credits)...');

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
        this.logStatus('Browser CORS policy blocked direct connection. Checking local proxy on http://localhost:8787...');
        try {
          const testProxy = await fetch('http://localhost:8787/api/v1/engines', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (testProxy.ok) {
            this.logStatus('Local CORS Proxy detected! Automatically routing through http://localhost:8787/api/v1...');
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
        } catch (_) {}

        errMsg = 'Browser CORS blocked direct access. Run "python3 proxy.py" in terminal or click "Use Local Proxy" above, or switch to Simulator Mode.';
      }

      this.logStatus(errMsg, true);
      this.dom.btnConnectAtlas.disabled = false;
      this.dom.btnPlaySimulator.disabled = false;
    }
  }

  startWithSimulator() {
    this.logStatus('Starting Local Quantum Simulator (1024 shots generated)...');
    const batchData = simulateLocalGraphBatch(this.seed, 1024, 0.85);

    try {
      sessionStorage.setItem(STORAGE_KEY_SHOTS, JSON.stringify(batchData));
    } catch (_) {}

    this.mode = 'simulator';
    this.loadBatch(batchData);
    this.dom.titleModal.classList.add('hidden');
  }

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

  loadBatch(batchData) {
    this.shots = batchData.shots;
    this.seed = batchData.seed || 7;
    this.dayIndex = 0;

    // Use 16-day subset for this playthrough
    const sixteenDaysShots = this.shots.slice(0, MAX_DAYS);
    this.stats = computeStatistics(sixteenDaysShots);
    this.statements = generateStatementList(this.stats, this.seed);
    this.userAnswers = {};
    this.isSubmitted = false;

    this.renderChecklist();
    this.dom.scoreBanner.classList.add('hidden');
    this.dom.btnSubmitChecklist.disabled = false;
    this.dom.btnSubmitChecklist.textContent = 'Submit Observations';

    // Header Badges
    this.dom.topJourney.textContent = `Journey ${this.journey}`;
    this.dom.topModeBadge.textContent = this.mode === 'atlas'
      ? `Moth Atlas (${batchData.jobId ? batchData.jobId.slice(0, 8) : 'graph-v1'})`
      : 'Local Quantum Simulator';
    this.dom.topModeBadge.className = `mode-badge ${this.mode}`;

    this.applyDay(0);
  }

  /**
   * Advance to Next Day (N key or Next Day button)
   */
  nextDay() {
    if (this.shots.length === 0) return;

    if (this.dayIndex + 1 < MAX_DAYS) {
      this.dayIndex++;
      this.renderer.triggerDayTransition(this.dayIndex + 1);
      this.audio.playDayTransition();
      this.applyDay(this.dayIndex);
      this.updateToolbarLabels();
    } else {
      // Reached Day 16: Automatically submit the observations!
      if (!this.isSubmitted) {
        this.submitNotebook(true);
      } else {
        alert('You have completed all 16 days of this journey! Click "New 16-Day Journey" to explore the next set of days.');
      }
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
    this.dom.topDay.textContent = `Day ${currentDay} of ${MAX_DAYS}`;
    const pct = (currentDay / MAX_DAYS) * 100;
    this.dom.dayProgressBar.style.width = `${pct}%`;
  }

  /**
   * Render the 5 simplified checklist statements in the side panel
   */
  renderChecklist() {
    const container = this.dom.checklistCards;
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

      const btnTrue = document.createElement('button');
      btnTrue.type = 'button';
      btnTrue.className = 'choice-btn true-btn';
      btnTrue.textContent = 'True';
      btnTrue.addEventListener('click', () => this.selectAnswer(st.id, true));

      const btnFalse = document.createElement('button');
      btnFalse.type = 'button';
      btnFalse.className = 'choice-btn false-btn';
      btnFalse.textContent = 'False';
      btnFalse.addEventListener('click', () => this.selectAnswer(st.id, false));

      choiceGroup.appendChild(btnTrue);
      choiceGroup.appendChild(btnFalse);

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
    if (this.isSubmitted) return;

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
   * Submit the 5 statements and reveal score
   */
  submitNotebook(isAuto = false) {
    if (this.isSubmitted) return;

    // If submitted manually early, ensure at least some answers are chosen
    const answeredCount = Object.keys(this.userAnswers).length;
    if (!isAuto && answeredCount < this.statements.length) {
      const confirmEarly = confirm(`You have answered ${answeredCount} of ${this.statements.length} observations. Submit early?`);
      if (!confirmEarly) return;
    }

    const scoring = scoreNotebook(this.statements, this.userAnswers);
    this.isSubmitted = true;

    this.dom.scoreBanner.classList.remove('hidden');
    this.dom.scoreNumber.textContent = `${scoring.score} / ${scoring.total} Correct (${scoring.percentage}%)`;

    let msg = '';
    if (scoring.score === 5) {
      msg = 'Perfection! You decoded the quantum bond: qubits 0 & 2 are entangled, keeping resting and active states completely synchronized across 9,560 km.';
    } else if (scoring.score >= 3) {
      msg = 'Strong observational intuition! You noticed the primary rule: when one rests, the other rests; when one is active, the other is active.';
    } else {
      msg = 'Quantum correlations can be surprising. Check the explanations below to discover how the lovers were entangled!';
    }
    this.dom.scoreInsight.textContent = msg;

    scoring.results.forEach((res) => {
      const card = document.getElementById(`statement-card-${res.id}`);
      const resultEl = document.getElementById(`statement-result-${res.id}`);
      if (!card || !resultEl) return;

      card.classList.add(res.isCorrect ? 'card-correct' : 'card-incorrect');
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div class="result-badge ${res.isCorrect ? 'badge-correct' : 'badge-incorrect'}">
          ${res.isCorrect ? '✓ Correct' : '✗ Incorrect'} (Truth: ${res.groundTruth ? 'TRUE' : 'FALSE'})
        </div>
        <div class="result-explanation">${res.explanation}</div>
      `;
    });

    this.dom.btnSubmitChecklist.disabled = true;
    this.dom.btnSubmitChecklist.textContent = isAuto ? '16 Days Complete (Submitted)' : 'Submitted';
  }

  startNewJourney() {
    this.journey += 1;
    // Shift shots array or advance seed for the next 16 days
    if (this.shots.length > (this.journey * MAX_DAYS)) {
      const next16 = this.shots.slice((this.journey - 1) * MAX_DAYS, this.journey * MAX_DAYS);
      this.dayIndex = 0;
      this.stats = computeStatistics(next16);
      this.statements = generateStatementList(this.stats, this.seed + this.journey);
      this.userAnswers = {};
      this.isSubmitted = false;

      this.renderChecklist();
      this.dom.scoreBanner.classList.add('hidden');
      this.dom.btnSubmitChecklist.disabled = false;
      this.dom.btnSubmitChecklist.textContent = 'Submit Observations';
      this.dom.topJourney.textContent = `Journey ${this.journey}`;
      this.applyDay(0);
    } else {
      // Generate new batch
      this.seed = (this.seed * 31 + 17) % 9999 + 1;
      this.startWithSimulator();
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
