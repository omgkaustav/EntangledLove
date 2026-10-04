/**
 * atlas.js - Moth Atlas graph-v1 Engine Client & Quantum Simulator
 * 
 * Handles job dispatch, schema retry fallback, polling, count parsing,
 * and local offline simulation for "Entangled Love".
 */

export const ATLAS_DEFAULT_BASE_URL = 'https://api.mothquantum.com/api/v1';
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
 * Produces 1024 shots of a 4-qubit graph state with qubits 0 and 2 coupled (target ~0.85)
 * and qubits 1 and 3 uncoupled (free).
 * 
 * Qubit 0, 1: Person A (00: bed, 01: thinking, 10: playing, 11: cooking)
 * Qubit 2, 3: Person B (00: bed, 01: thinking, 10: playing, 11: cooking)
 */
export function simulateLocalGraphBatch(seed = 7, shotsCount = 1024, targetCorr = 0.85) {
  const rng = mulberry32(seed);
  const shots = [];
  const counts = {};

  for (let i = 0; i < shotsCount; i++) {
    // Qubit 0: 50/50 basis state
    const b0 = rng() < 0.5 ? 0 : 1;

    // Qubit 2: coupled to Qubit 0 with target correlation (default 0.85)
    // When correlated, b2 matches b0 with probability targetCorr
    const b2 = rng() < targetCorr ? b0 : (1 - b0);

    // Qubit 1: free / uncoupled
    const b1 = rng() < 0.5 ? 0 : 1;

    // Qubit 3: free / uncoupled
    const b3 = rng() < 0.5 ? 0 : 1;

    // A shot is four bits b0 b1 b2 b3
    const bitstring = `${b0}${b1}${b2}${b3}`;
    shots.push(bitstring);
    counts[bitstring] = (counts[bitstring] || 0) + 1;
  }

  return {
    source: 'simulator',
    seed,
    shots,
    counts,
    shotsCount: shots.length,
    timestamp: Date.now()
  };
}

/**
 * Normalize bitstring key from various response shapes:
 * - If integer 0..15: format as 4 bits, low qubit (qubit 0) on the right:
 *   e.g. integer k: bit0 is (k >> 0)&1, bit1 is (k >> 1)&1, bit2 is (k >> 2)&1, bit3 is (k >> 3)&1
 *   Bitstring "b0b1b2b3"
 * - If already a bitstring of length 4: keep as "b0b1b2b3"
 */
export function normalizeBitstringKey(rawKey) {
  const str = String(rawKey).trim();
  // If numeric integer string
  if (/^\d+$/.test(str) && str.length < 4) {
    const k = parseInt(str, 10);
    // Low qubit on the right:
    // Qubit 0 = (k >> 0) & 1
    // Qubit 1 = (k >> 1) & 1
    // Qubit 2 = (k >> 2) & 1
    // Qubit 3 = (k >> 3) & 1
    const b0 = (k >> 0) & 1;
    const b1 = (k >> 1) & 1;
    const b2 = (k >> 2) & 1;
    const b3 = (k >> 3) & 1;
    return `${b0}${b1}${b2}${b3}`;
  }
  // If bitstring like "0101"
  if (/^[01]{4}$/.test(str)) {
    return str;
  }
  // If longer or shorter bitstring, pad or slice to 4
  if (/^[01]+$/.test(str)) {
    return str.padStart(4, '0').slice(-4);
  }
  return str.padStart(4, '0');
}

/**
 * Turn counts dictionary or sample list into a full array of 1024 4-bit strings
 */
export function expandToShotList(rawResult, expectedShots = 1024, seed = 7) {
  const rng = mulberry32(seed);

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

  /**
   * Submit job with 422 schema fallback retry list.
   * Per requirements:
   * Try relationship with qubits [0, 2], target 0.85.
   * On 422, read errors[] and retry small set of reasonable shapes.
   * If none validate, drop operations and coupling_map, keep seed: 7, continue.
   */
  async submitGraphJob(seed = 7, onProgress = () => {}) {
    const candidatePayloads = [
      // Primary candidate
      {
        name: 'standard_qubits_target',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { type: 'relationship', qubits: [0, 2], target: 0.85 }
            ]
          }
        }
      },
      // Variant 2: op instead of type
      {
        name: 'op_qubits_target',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { op: 'relationship', qubits: [0, 2], target: 0.85 }
            ]
          }
        }
      },
      // Variant 3: name instead of type
      {
        name: 'name_qubits_target',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { name: 'relationship', qubits: [0, 2], target: 0.85 }
            ]
          }
        }
      },
      // Variant 4: edge instead of qubits
      {
        name: 'type_edge_target',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { type: 'relationship', edge: [0, 2], target: 0.85 }
            ]
          }
        }
      },
      // Variant 5: edge with value
      {
        name: 'type_edge_value',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { type: 'relationship', edge: [0, 2], value: 0.85 }
            ]
          }
        }
      },
      // Variant 6: pauli / zz operator
      {
        name: 'type_zz_qubits_target',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed,
            coupling_map: [[0, 2]],
            operations: [
              { type: 'zz', qubits: [0, 2], target: 0.85 }
            ]
          }
        }
      },
      // Ultimate fallback: drop operations & coupling_map, keep seed: 7
      {
        name: 'fallback_untargeted_seeded',
        body: {
          params: {
            mode: 'emu',
            num_qubits: 4,
            shots: 1024,
            seed: seed
          }
        }
      }
    ];

    let lastError = null;

    for (const candidate of candidatePayloads) {
      onProgress(`Attempting graph-v1 payload schema: [${candidate.name}]...`);
      try {
        const resp = await fetch(`${this.baseUrl}/engines/graph-v1/process`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(candidate.body)
        });

        if (resp.status === 200 || resp.status === 202) {
          const data = await resp.json();
          console.log(`[Atlas API] Successfully accepted payload [${candidate.name}]:`, data);
          onProgress(`Payload [${candidate.name}] accepted! Job ID: ${data.job_id || 'direct'}`);
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
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error(`Network/CORS error connecting to ${this.baseUrl}. If accessing from browser, consider using the proxy or simulator mode.`);
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
   * Poll job status until completed, failed, or cancelled
   */
  async pollJobUntilDone(jobId, onProgress = () => {}, intervalMs = 2000, maxAttempts = 60) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      onProgress(`Polling job ${jobId}... (attempt ${attempt})`);
      
      const resp = await fetch(`${this.baseUrl}/jobs/${jobId}/status`, {
        method: 'GET',
        headers: this.getHeaders()
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

      // Wait 2 seconds before next poll
      await new Promise(r => setTimeout(r, intervalMs));
    }

    throw new Error(`Job ${jobId} polling timed out after ${maxAttempts * (intervalMs / 1000)}s`);
  }

  /**
   * Retrieve job result payload
   */
  async getJobResult(jobId) {
    const resp = await fetch(`${this.baseUrl}/jobs/${jobId}/result`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch job result: HTTP ${resp.status} - ${text}`);
    }

    return await resp.json();
  }

  /**
   * Run full batch pipeline: submit -> poll -> fetch result -> normalize
   */
  async fetchBatch(seed = 7, onProgress = () => {}) {
    onProgress('Submitting 1024-shot job to Moth Atlas graph-v1 engine (5 credits)...');
    const submission = await this.submitGraphJob(seed, onProgress);

    let rawResult;
    if (submission.directResult) {
      rawResult = submission.directResult;
    } else if (submission.jobId) {
      await this.pollJobUntilDone(submission.jobId, onProgress);
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
