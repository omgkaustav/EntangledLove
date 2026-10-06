/**
 * atlas.js - Moth Atlas graph-v1 Engine Client & Quantum Simulator
 * 
 * Handles job dispatch, schema retry fallback, polling, count parsing,
 * and local offline simulation for "Entangled Love".
 */

import { getQuantumStateConfig } from './stats.js';

export function getDefaultAtlasEndpoint() {
  if (typeof window === 'undefined') {
    return 'https://api.mothquantum.com/api/v1';
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:';

  // 1. If deployed on Vercel or any remote domain, ALWAYS use same-origin /api/v1
  // Same-origin calls NEVER suffer from browser CORS blocking!
  if (!isLocal) {
    return `${window.location.origin}/api/v1`;
  }

  // 2. On localhost: check if a valid non-direct endpoint is cached in sessionStorage
  const cached = sessionStorage.getItem(STORAGE_KEY_ENDPOINT);
  if (cached && !cached.includes('api.mothquantum.com')) {
    return cached;
  }

  // 3. On localhost: default to local proxy port 8787
  return 'http://localhost:8787/api/v1';
}

export const ATLAS_DEFAULT_BASE_URL = getDefaultAtlasEndpoint();
export const STORAGE_KEY_API_KEY = 'entangled_love_atlas_api_key';
export const STORAGE_KEY_ENDPOINT = 'entangled_love_atlas_endpoint';
export const STORAGE_KEY_SHOTS = 'entangled_love_shots_cache';
export const STORAGE_KEY_META = 'entangled_love_meta_cache';

/**
 * Seeded PRNG (Mulberry32) for reproducible local simulation and shuffling
 */
export function mulberry32(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Local Quantum Simulator Mode
 * Produces 1024 shots of a 6-qubit graph state (3 qubits for Leo, 3 qubits for Mia).
 * Realistic quantum hardware fidelity (0.94 target correlation + 0.06 readout noise).
 * 
 * Qubits 0..2: Leo in London (8 canonical nocturnal activities, 000..111)
 * Qubits 3..5: Mia in Tokyo  (8 canonical nocturnal activities, 000..111)
 */
export function simulateLocalGraphBatch(stateSeed = 1, shotsCount = 1024, sampleSeed = 7) {
  const config = getQuantumStateConfig(stateSeed);
  const rng = mulberry32(sampleSeed || 7);
  const shots = [];
  const counts = {};

  const { mapping, fidelity } = config;

  for (let i = 0; i < shotsCount; i++) {
    // Leo's activity uniformly distributed across the 8 activities (1/8 each)
    const actA = Math.floor(rng() * 8);

    // Mia's activity is coupled via the quantum state mapping with fidelity 0.94
    let actB;
    if (rng() < fidelity) {
      actB = mapping[actA];
    } else {
      // 6% realistic readout noise: picks another activity uniformly
      const noiseOffset = Math.floor(rng() * 7) + 1;
      actB = (mapping[actA] + noiseOffset) % 8;
    }

    // Convert to 3 bits each (6 bits total: a0 a1 a2 b0 b1 b2)
    const a0 = (actA >> 2) & 1;
    const a1 = (actA >> 1) & 1;
    const a2 = actA & 1;

    const b0 = (actB >> 2) & 1;
    const b1 = (actB >> 1) & 1;
    const b2 = actB & 1;

    const bitstring = `${a0}${a1}${a2}${b0}${b1}${b2}`;
    shots.push(bitstring);
    counts[bitstring] = (counts[bitstring] || 0) + 1;
  }

  return {
    source: 'simulator',
    stateSeed: config.id,
    sampleSeed,
    shots,
    counts,
    shotsCount: shots.length,
    timestamp: Date.now()
  };
}

/**
 * Normalize bitstring key from various response shapes:
 * - If integer 0..63: format as 6 bits (b0b1b2b3b4b5)
 * - If already a bitstring of length 6: keep as "b0b1b2b3b4b5"
 */
export function normalizeBitstringKey(rawKey) {
  const str = String(rawKey).trim();
  // If numeric integer string
  if (/^\d+$/.test(str) && str.length < 6) {
    const k = parseInt(str, 10);
    return k.toString(2).padStart(6, '0');
  }
  // If bitstring like "010101"
  if (/^[01]{6}$/.test(str)) {
    return str;
  }
  // If longer or shorter bitstring, pad or slice to 6
  if (/^[01]+$/.test(str)) {
    return str.padStart(6, '0').slice(-6);
  }
  return str.padStart(6, '0');
}

/**
 * Turn counts dictionary or sample list into a full array of 1024 4-bit strings
 */
export function expandToShotList(rawResult, expectedShots = 1024, seed = 7) {
  const rng = mulberry32(seed);

  // Case 0: Moth Atlas graph-v1 output.measurements array
  // Shape: { result: { output: { measurements: [ { bitstring: "0101", count: 120 }, ... ] } } }
  const measurements = rawResult.result?.output?.measurements
    || rawResult.output?.measurements
    || rawResult.measurements;

  if (Array.isArray(measurements) && measurements.length > 0) {
    const shotPool = [];
    for (const m of measurements) {
      const bitstring = normalizeBitstringKey(m.bitstring);
      const count = typeof m.count === 'number' ? m.count : parseInt(m.count, 10) || 0;
      for (let i = 0; i < count; i++) {
        shotPool.push(bitstring);
      }
    }
    // Fisher-Yates shuffle the pool with seed PRNG so order appears natural across evenings
    for (let i = shotPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = shotPool[i];
      shotPool[i] = shotPool[j];
      shotPool[j] = temp;
    }
    return shotPool;
  }

  // Case 1: samples array
  if (Array.isArray(rawResult.samples) && rawResult.samples.length > 0) {
    return rawResult.samples.map(s => {
      if (Array.isArray(s)) return s.slice(0, 4).join('');
      return normalizeBitstringKey(s);
    });
  }

  // Case 2: bitstrings array
  if (Array.isArray(rawResult.bitstrings) && rawResult.bitstrings.length > 0) {
    return rawResult.bitstrings.map(s => normalizeBitstringKey(s));
  }

  // Case 3: counts map
  let countsObj = rawResult.counts || rawResult;
  if (rawResult.result && rawResult.result.counts) {
    countsObj = rawResult.result.counts;
  } else if (rawResult.result && (rawResult.result.samples || rawResult.result.bitstrings)) {
    return expandToShotList(rawResult.result, expectedShots, seed);
  }

  if (countsObj && typeof countsObj === 'object') {
    const shotPool = [];
    for (const [key, count] of Object.entries(countsObj)) {
      const bitstring = normalizeBitstringKey(key);
      const n = typeof count === 'number' ? count : parseInt(count, 10) || 0;
      for (let i = 0; i < n; i++) {
        shotPool.push(bitstring);
      }
    }
    // Fisher-Yates shuffle the pool with seed PRNG so order appears natural across evenings
    for (let i = shotPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = shotPool[i];
      shotPool[i] = shotPool[j];
      shotPool[j] = temp;
    }
    return shotPool;
  }

  throw new Error('Unsupported result format from quantum engine');
}

/**
 * Atlas graph-v1 API Client
 */
export class AtlasClient {
  constructor(apiKey = '', baseUrl = ATLAS_DEFAULT_BASE_URL) {
    this.apiKey = apiKey.trim();
    this.baseUrl = (baseUrl || ATLAS_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.abortController = null;
    this.isAborted = false;
    this.currentJobId = null;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
  }

  setBaseUrl(url) {
    this.baseUrl = (url || ATLAS_DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  abort() {
    this.isAborted = true;
    if (this.currentJobId) {
      try {
        fetch(`${this.baseUrl}/jobs/${this.currentJobId}/cancel`, {
          method: 'POST',
          headers: this.getHeaders()
        }).catch(() => {});
      } catch (_) {}
    }
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (_) {}
    }
  }

  /**
   * Submit job with 422 schema fallback retry list.
   * Supports mode: 'emu' (Emulator) or 'qpu' (Quantum Processing Unit / Hardware).
   */
  async submitGraphJob(seed = 7, onProgress = () => {}, mode = 'emu') {
    if (this.isAborted) {
      throw new Error('Operation aborted by user');
    }
    const targetMode = mode === 'qpu' ? 'qpu' : 'emu';
    const candidatePayloads = [
      // Candidate 1 (Verified Working on Moth Atlas): Superpositions + ZZ relationship on pair (0, 3)
      {
        name: 'bloch_and_relationship_zz_graph_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3], [1, 4], [2, 5]],
            operations: [
              { type: 'bloch', qubit: 0, paulis: { 'X': 1.0 } },
              { type: 'bloch', qubit: 1, paulis: { 'X': 1.0 } },
              { type: 'bloch', qubit: 2, paulis: { 'X': 1.0 } },
              { type: 'bloch', qubit: 3, paulis: { 'X': 1.0 } },
              { type: 'bloch', qubit: 4, paulis: { 'X': 1.0 } },
              { type: 'bloch', qubit: 5, paulis: { 'X': 1.0 } },
              { type: 'relationship', qubits: [0, 3], paulis: { 'ZZ': 1.0 } }
            ]
          }
        }
      },
      // Candidate 2: Direct relationship with paulis ZZ on 6 qubits
      {
        name: 'relationship_paulis_zz_graph_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3], [1, 4], [2, 5]],
            operations: [
              { type: 'relationship', qubits: [0, 3], paulis: { 'ZZ': 1.0 } }
            ]
          }
        }
      },
      // Candidate 3: Standard qubits target
      {
        name: 'standard_qubits_target_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { type: 'relationship', qubits: [0, 3], target: 0.94 }
            ]
          }
        }
      },
      // Variant 2: op instead of type
      {
        name: 'op_qubits_target_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { op: 'relationship', qubits: [0, 3], target: 0.94 }
            ]
          }
        }
      },
      // Variant 3: name instead of type
      {
        name: 'name_qubits_target_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { name: 'relationship', qubits: [0, 3], target: 0.94 }
            ]
          }
        }
      },
      // Variant 4: edge instead of qubits
      {
        name: 'type_edge_target_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { type: 'relationship', edge: [0, 3], target: 0.94 }
            ]
          }
        }
      },
      // Variant 5: edge with value
      {
        name: 'type_edge_value_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { type: 'relationship', edge: [0, 3], value: 0.94 }
            ]
          }
        }
      },
      // Variant 6: pauli / zz operator
      {
        name: 'type_zz_qubits_target_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 3]],
            operations: [
              { type: 'zz', qubits: [0, 3], target: 0.94 }
            ]
          }
        }
      },
      // Ultimate fallback: drop operations & coupling_map, keep seed: 7
      {
        name: 'fallback_untargeted_seeded_6q',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 6,
            shots: 1024,
            seed: seed
          }
        }
      }
    ];

    candidatePayloads.forEach(c => {
      c.body.params.mode = targetMode;
    });

    let lastError = null;

    for (const candidate of candidatePayloads) {
      if (this.isAborted) throw new Error('Operation aborted by user');
      onProgress(`Attempting graph-v1 payload schema: [${candidate.name}] (${targetMode.toUpperCase()})...`);
      try {
        const resp = await fetch(`${this.baseUrl}/engines/graph-v1/process`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(candidate.body),
          signal: this.abortController?.signal
        });

        if (resp.status === 200 || resp.status === 202) {
          const data = await resp.json();
          console.log(`[Atlas API] Successfully accepted payload [${candidate.name}] (${targetMode}):`, data);
          onProgress(`Payload [${candidate.name}] accepted on ${targetMode.toUpperCase()}! Job ID: ${data.job_id || 'direct'}`);
          return {
            jobId: data.job_id || data.id,
            status: data.status || 'queued',
            successfulPayloadName: candidate.name,
            directResult: data.result || (data.counts ? data : null)
          };
        } else if (resp.status === 422) {
          let errData;
          try { errData = await resp.json(); } catch (_) { errData = { error: 'Unknown 422' }; }
          console.warn(`[Atlas API] 422 Validation Error on [${candidate.name}]:`, errData.errors || errData);
          lastError = new Error(`422 Validation error: ${JSON.stringify(errData.errors || errData)}`);
          // Continue loop to next candidate
          continue;
        } else if (resp.status === 401 || resp.status === 403) {
          throw new Error('Authentication failed (401/403). Please verify your Moth Atlas API key.');
        } else {
          const errText = await resp.text();
          throw new Error(`API returned HTTP ${resp.status}: ${errText}`);
        }
      } catch (err) {
        if (this.isAborted || err.name === 'AbortError') {
          throw new Error('Operation aborted by user');
        }
        const isNetworkOrCors = err.name === 'TypeError' ||
          err.message?.includes('fetch') ||
          err.message?.includes('Load failed') ||
          err.message?.includes('NetworkError');
        if (isNetworkOrCors) {
          throw new Error(`Network/CORS error connecting to ${this.baseUrl}. Direct browser calls to Moth Atlas are blocked by CORS policy. Please use the proxy or simulator mode.`);
        }
        if (err.message.includes('Authentication failed')) {
          throw err;
        }
        lastError = err;
        console.warn(`[Atlas API] Error with [${candidate.name}]:`, err.message);
      }
    }

    throw lastError || new Error('Failed all payload attempts on Atlas API');
  }

  /**
   * Poll job status until completed, failed, or cancelled.
   * Respects user abort signal and supports extended timeout for QPU hardware queues.
   */
  async pollJobUntilDone(jobId, onProgress = () => {}, intervalMs = 2000, maxAttempts = 180, targetMode = 'emu') {
    this.currentJobId = jobId;
    const modeTag = targetMode === 'qpu' ? ' • QPU Queue' : '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.isAborted) {
        throw new Error('Operation aborted by user');
      }
      onProgress(`Polling job ${String(jobId).slice(0, 8)}... (attempt ${attempt}${modeTag})`);
      
      const resp = await fetch(`${this.baseUrl}/jobs/${jobId}/status`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.abortController?.signal
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to check job status: HTTP ${resp.status} - ${text}`);
      }

      const statusData = await resp.json();
      const status = (statusData.status || '').toLowerCase();
      console.log(`[Atlas API] Job ${jobId} status: ${status}`);

      if (status === 'completed' || status === 'succeeded' || status === 'done') {
        return statusData;
      }
      if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
        throw new Error(`Job ended with status: ${status}. ${JSON.stringify(statusData.error || '')}`);
      }

      // Abort-aware sleep
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs);
        if (this.abortController) {
          const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('Operation aborted by user'));
          };
          this.abortController.signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    throw new Error(`Job ${jobId} polling timed out after ${maxAttempts * (intervalMs / 1000)}s`);
  }

  /**
   * Retrieve job result payload
   */
  async getJobResult(jobId) {
    const resp = await fetch(`${this.baseUrl}/jobs/${jobId}/result`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: this.abortController?.signal
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch job result: HTTP ${resp.status} - ${text}`);
    }

    return await resp.json();
  }

  /**
   * Run full batch pipeline: submit -> poll -> fetch result -> normalize.
   * Mode can be 'emu' (Fast Cloud Emulator) or 'qpu' (Real Quantum Processing Unit).
   */
  async fetchBatch(seed = 7, onProgress = () => {}, mode = 'emu') {
    this.isAborted = false;
    this.currentJobId = null;
    this.abortController = new AbortController();

    const targetMode = mode === 'qpu' ? 'qpu' : 'emu';
    const modeLabel = targetMode === 'qpu' ? 'Real Quantum Hardware (QPU)' : 'Cloud Emulator (emu)';
    onProgress(`Submitting 1024-shot job to Moth Atlas (${modeLabel}, 5 credits)...`);

    const submission = await this.submitGraphJob(seed, onProgress, targetMode);
    this.currentJobId = submission.jobId || null;

    let rawResult;
    if (submission.directResult) {
      rawResult = submission.directResult;
    } else if (submission.jobId) {
      const maxAttempts = targetMode === 'qpu' ? 240 : 60; // 8 mins for QPU, 2 mins for emu
      await this.pollJobUntilDone(submission.jobId, onProgress, 2000, maxAttempts, targetMode);
      if (this.isAborted) throw new Error('Operation aborted by user');
      onProgress('Job completed! Retrieving measurement histogram...');
      rawResult = await this.getJobResult(submission.jobId);
    } else {
      throw new Error('No job ID or direct result returned');
    }

    const shots = expandToShotList(rawResult, 1024, seed);
    
    // Compute normalized counts
    const counts = {};
    for (const shot of shots) {
      counts[shot] = (counts[shot] || 0) + 1;
    }

    const batchData = {
      source: 'atlas',
      targetMode,
      jobId: submission.jobId || 'direct',
      successfulPayloadName: submission.successfulPayloadName,
      seed,
      shots,
      counts,
      shotsCount: shots.length,
      timestamp: Date.now()
    };

    // Cache in sessionStorage
    try {
      sessionStorage.setItem(STORAGE_KEY_SHOTS, JSON.stringify(batchData));
    } catch (e) {
      console.warn('Could not cache shots to sessionStorage:', e);
    }

    return batchData;
  }
}
