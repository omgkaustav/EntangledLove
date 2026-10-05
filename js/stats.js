/**
 * stats.js - 6-Qubit Quantum State Engine & Dynamic Field Notebook Generator
 * 
 * Manages 6-qubit quantum states (3 qubits for Leo, 3 qubits for Mia):
 * - 8 distinct nocturnal activities for each person (2^3 = 8).
 * - Direct activity-to-activity quantum correlation without arbitrary groupings.
 * - Real hardware fidelity (0.94 target correlation + 0.06 readout noise).
 * - Seeded system with 24 distinct quantum state archetypes.
 * - Dynamic generation of 10-statement rosters (with "almost always" / "almost never").
 * - Sub-selection of 5 balanced questions per investigation for high replayability.
 */

import { mulberry32 } from './atlas.js';

export const ACTIVITIES = [
  { code: 0, bits: '000', name: 'in bed', label: 'in bed' },
  { code: 1, bits: '001', name: 'thinking', label: 'thinking' },
  { code: 2, bits: '010', name: 'reading', label: 'reading' },
  { code: 3, bits: '011', name: 'listening to music', label: 'listening to music' },
  { code: 4, bits: '100', name: 'playing a game', label: 'playing a game' },
  { code: 5, bits: '101', name: 'cooking', label: 'cooking' },
  { code: 6, bits: '110', name: 'watering plants', label: 'watering plants' },
  { code: 7, bits: '111', name: 'stargazing', label: 'stargazing' }
];

/**
 * 24 distinct permutations on {0, 1, ..., 7} representing the 24 bipartite quantum state configurations.
 * Each permutation defines the coupled activity for Mia when Leo is observed in activity a.
 */
const PERMUTATIONS = [
  [0, 1, 2, 3, 4, 5, 6, 7], // 1: Direct Identity Symmetry
  [1, 2, 3, 4, 5, 6, 7, 0], // 2: Circular Shift +1
  [2, 3, 4, 5, 6, 7, 0, 1], // 3: Circular Shift +2
  [3, 4, 5, 6, 7, 0, 1, 2], // 4: Circular Shift +3
  [4, 5, 6, 7, 0, 1, 2, 3], // 5: Circular Shift +4
  [5, 6, 7, 0, 1, 2, 3, 4], // 6: Circular Shift +5
  [6, 7, 0, 1, 2, 3, 4, 5], // 7: Circular Shift +6
  [7, 0, 1, 2, 3, 4, 5, 6], // 8: Circular Shift +7
  [7, 6, 5, 4, 3, 2, 1, 0], // 9: Complete Inversion
  [1, 0, 3, 2, 5, 4, 7, 6], // 10: Pairwise Transposition
  [2, 3, 0, 1, 6, 7, 4, 5], // 11: Quad Transposition
  [4, 7, 6, 5, 0, 3, 2, 1], // 12: Reflected Octave
  [1, 4, 7, 2, 5, 0, 3, 6], // 13: Modular 3a + 1
  [2, 5, 0, 3, 6, 1, 4, 7], // 14: Modular 3a + 2
  [5, 0, 3, 6, 1, 4, 7, 2], // 15: Modular 3a + 5
  [7, 2, 5, 0, 3, 6, 1, 4], // 16: Modular 3a + 7
  [1, 6, 3, 0, 5, 2, 7, 4], // 17: Modular 5a + 1
  [2, 7, 4, 1, 6, 3, 0, 5], // 18: Modular 5a + 2
  [4, 1, 6, 3, 0, 5, 2, 7], // 19: Modular 5a + 4
  [6, 3, 0, 5, 2, 7, 4, 1], // 20: Modular 5a + 6
  [1, 0, 7, 6, 5, 4, 3, 2], // 21: Modular 7a + 1
  [3, 2, 1, 0, 7, 6, 5, 4], // 22: Modular 7a + 3
  [0, 2, 4, 6, 1, 3, 5, 7], // 23: Even-Odd Interlace
  [1, 3, 5, 7, 0, 2, 4, 6]  // 24: Odd-Even Interlace
];

const TITLES = [
  'Direct Symmetry', 'Shift Harmonic', 'Dual Resonance',
  'Chamber Shift', 'Counterpoint Echo', 'Mirror Harmonic',
  'Transverse Continuum', 'Inverse Wave', 'Time-Reversal',
  'Pairwise Entanglement', 'Cross-Quad Resonance', 'Reflected Octave',
  'Tri-Phase Cadence', 'Tokyo Meridian', 'London Meridian',
  'Starlight Telepathy', 'Penta-Harmonic Wave', 'Resonant Chord',
  'Cosmic Orbit', 'Ethereal Interval', 'Septenary Phase',
  'Counterpoint Drift', 'Even-Odd Interlace', 'Odd-Even Interlace'
];

/**
 * Catalogue of 24 distinct quantum state configurations
 */
export function getQuantumStateConfig(seed = 1) {
  // Normalize seed to 1..24
  const id = ((Math.abs(Math.floor(seed)) - 1) % 24) + 1;
  const mapping = PERMUTATIONS[id - 1] || PERMUTATIONS[0];

  const inverseMapping = new Array(8);
  for (let a = 0; a < 8; a++) {
    inverseMapping[mapping[a]] = a;
  }

  return {
    id,
    title: TITLES[id - 1] || `State #${id}`,
    mapping,
    inverseMapping,
    fidelity: 0.94 // 94% quantum correlation fidelity, 6% realistic readout noise
  };
}

/**
 * Calculates the exact 8x8 joint probability distribution P[a][b] for a given quantum state
 */
export function computeTheoreticalDistribution(config) {
  const P = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const { mapping, fidelity } = config;
  const noisePerOther = (1.0 - fidelity) / 7;

  for (let a = 0; a < 8; a++) {
    const targetB = mapping[a];
    for (let b = 0; b < 8; b++) {
      const condProb = (b === targetB) ? fidelity : noisePerOther;
      P[a][b] = (1 / 8) * condProb;
    }
  }

  return P;
}

/**
 * Build a roster of 10 candidate statements (5 True, 5 False) tailored to the quantum state,
 * comparing specific individual activities with realistic quantum uncertainty.
 */
export function buildQuestionRoster(config) {
  const { id, mapping, inverseMapping } = config;

  // Pick 5 distinct activities using the state id offset
  const offset = (id - 1) % 8;
  const a1 = (offset + 0) % 8;
  const b1 = (offset + 1) % 8;
  const a2 = (offset + 2) % 8;
  const b2 = (offset + 3) % 8;
  const a3 = (offset + 4) % 8;

  const actA1 = ACTIVITIES[a1];
  const actB1_corr = ACTIVITIES[mapping[a1]];
  const b1_wrong = (mapping[a1] + 4) % 8;
  const actB1_wrong = ACTIVITIES[b1_wrong];

  const actB1 = ACTIVITIES[b1];
  const actA1_corr = ACTIVITIES[inverseMapping[b1]];
  const a1_wrong = (inverseMapping[b1] + 3) % 8;
  const actA1_wrong = ACTIVITIES[a1_wrong];

  const actA2 = ACTIVITIES[a2];
  const actB2_corr = ACTIVITIES[mapping[a2]];
  const b2_other = (mapping[a2] + 3) % 8;
  const actB2_other = ACTIVITIES[b2_other];

  const actB2 = ACTIVITIES[b2];
  const actA2_corr = ACTIVITIES[inverseMapping[b2]];
  const a2_other = (inverseMapping[b2] + 2) % 8;
  const actA2_other = ACTIVITIES[a2_other];

  const actA3 = ACTIVITIES[a3];
  const actB3_corr = ACTIVITIES[mapping[a3]];
  const b3_wrong = (mapping[a3] + 5) % 8;
  const actB3_wrong = ACTIVITIES[b3_wrong];

  const candidateTrue = [
    {
      text: `When Leo is ${actA1.name}, Mia is almost always ${actB1_corr.name}.`,
      isTrue: true,
      ruleType: 'corr_forward',
      explanation: `True! Under this quantum state, whenever Leo is ${actA1.name}, quantum entanglement strongly couples Mia to ${actB1_corr.name} in Tokyo (~94% of evenings).`
    },
    {
      text: `When Mia is ${actB1.name}, Leo is almost always ${actA1_corr.name}.`,
      isTrue: true,
      ruleType: 'corr_reverse',
      explanation: `True! Whenever Mia is ${actB1.name} in Tokyo, their quantum bond entangles Leo into ${actA1_corr.name} in London (~94% of evenings).`
    },
    {
      text: `When Leo is ${actA2.name}, Mia is almost never ${actB2_other.name}.`,
      isTrue: true,
      ruleType: 'never_forward',
      explanation: `True! When Leo is ${actA2.name}, Mia is almost always ${actB2_corr.name}—she is almost never ${actB2_other.name} (<1% of evenings).`
    },
    {
      text: `When Mia is ${actB2.name}, Leo is almost never ${actA2_other.name}.`,
      isTrue: true,
      ruleType: 'never_reverse',
      explanation: `True! When Mia is ${actB2.name}, Leo is almost always ${actA2_corr.name}—he is almost never ${actA2_other.name} (<1% of evenings).`
    },
    {
      text: `When Leo is ${actA3.name}, Mia is almost always ${actB3_corr.name}.`,
      isTrue: true,
      ruleType: 'corr_forward_2',
      explanation: `True! Whenever Leo is ${actA3.name}, Mia is almost always ${actB3_corr.name} across the 9,560 km.`
    }
  ];

  const candidateFalse = [
    {
      text: `When Leo is ${actA1.name}, Mia is almost always ${actB1_wrong.name}.`,
      isTrue: false,
      ruleType: 'false_forward_target',
      explanation: `False! When Leo is ${actA1.name}, Mia is actually almost always ${actB1_corr.name}, not ${actB1_wrong.name}.`
    },
    {
      text: `When Mia is ${actB1.name}, Leo is almost always ${actA1_wrong.name}.`,
      isTrue: false,
      ruleType: 'false_reverse_target',
      explanation: `False! When Mia is ${actB1.name}, Leo is actually almost always ${actA1_corr.name}, not ${actA1_wrong.name}.`
    },
    {
      text: `When Leo is ${actA2.name}, Mia is almost never ${actB2_corr.name}.`,
      isTrue: false,
      ruleType: 'false_deny_true',
      explanation: `False! In fact, whenever Leo is ${actA2.name}, Mia is almost always ${actB2_corr.name} (~94% of evenings)!`
    },
    {
      text: `When Mia is ${actB2.name}, Leo is almost never ${actA2_corr.name}.`,
      isTrue: false,
      ruleType: 'false_deny_true_rev',
      explanation: `False! In fact, whenever Mia is ${actB2.name}, Leo is almost always ${actA2_corr.name} (~94% of evenings)!`
    },
    {
      text: `When Leo is ${actA3.name}, Mia is almost always ${actB3_wrong.name}.`,
      isTrue: false,
      ruleType: 'false_forward_target_2',
      explanation: `False! When Leo is ${actA3.name}, Mia is actually almost always ${actB3_corr.name}, not ${actB3_wrong.name}.`
    }
  ];

  return {
    poolTrue: candidateTrue,
    poolFalse: candidateFalse
  };
}

/**
 * Generates a 5-statement Field Notebook page from the 10-question roster
 * using the selection seed.
 */
export function generateStatementList(stateSeed = 1, selectionSeed = 7) {
  const config = getQuantumStateConfig(stateSeed);
  const { poolTrue, poolFalse } = buildQuestionRoster(config);

  const rng = mulberry32(selectionSeed);

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  const shuffledTrue = shuffle(poolTrue);
  const shuffledFalse = shuffle(poolFalse);

  // Pick 3 True and 2 False statements from the roster of 10
  const selected = [
    shuffledTrue[0],
    shuffledTrue[1],
    shuffledTrue[2],
    shuffledFalse[0],
    shuffledFalse[1]
  ];

  const ordered = shuffle(selected);

  return ordered.map((st, index) => ({
    id: index + 1,
    text: st.text,
    isTrue: st.isTrue,
    ruleType: st.ruleType,
    explanation: st.explanation
  }));
}

/**
 * Computes frequency stats over all observed 6-bit shots in the batch
 */
export function computeStatistics(shots) {
  const total = shots.length;
  const countA = new Array(8).fill(0);
  const countB = new Array(8).fill(0);
  const countAB = Array.from({ length: 8 }, () => new Array(8).fill(0));

  for (const s of shots) {
    const a = parseInt(s.slice(0, 3), 2);
    const b = parseInt(s.slice(3, 6), 2);
    countA[a]++;
    countB[b]++;
    countAB[a][b]++;
  }

  return {
    total,
    countA,
    countB,
    countAB
  };
}

/**
 * Scores user deduction answers against the ground truth
 */
export function scoreNotebook(statements, userAnswers) {
  let correctCount = 0;
  const results = statements.map(st => {
    const userChoice = userAnswers[st.id]; // boolean: true / false
    const isCorrect = userChoice === st.isTrue;
    if (isCorrect) correctCount++;
    return {
      id: st.id,
      text: st.text,
      userChoice,
      groundTruth: st.isTrue,
      isCorrect,
      explanation: st.explanation
    };
  });

  return {
    score: correctCount,
    total: statements.length,
    percentage: Math.round((correctCount / statements.length) * 100),
    results
  };
}
