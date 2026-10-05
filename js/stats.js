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
 * Build a roster of 20 candidate statements (10 True, 10 False) tailored to the quantum state,
 * with a healthy variety of correlation, exclusion, synchrony, pair, and disjunction patterns.
 */
export function buildQuestionRoster(config) {
  const { id, mapping, inverseMapping } = config;

  // Derive distinct indices across all 8 activities
  const offset = (id * 3) % 8;
  const idx = (k) => (offset + k) % 8;

  const a1 = idx(0);
  const a2 = idx(1);
  const a3 = idx(2);
  const a4 = idx(3);
  const a5 = idx(4);
  const a6 = idx(5);
  const a7 = idx(6);
  const a8 = idx(7);

  const b1 = idx(1);
  const b2 = idx(3);
  const b3 = idx(5);

  const poolTrue = [];
  const poolFalse = [];

  // Helper for choosing a distinct wrong activity
  const wrongFor = (corr, shift = 3) => {
    let w = (corr + shift) % 8;
    if (w === corr) w = (corr + 1) % 8;
    return w;
  };

  // --- TYPE 1: Forward Direct Correlation ---
  {
    const corr = mapping[a1];
    const wrong = wrongFor(corr, 3);
    poolTrue.push({
      text: `When Leo is ${ACTIVITIES[a1].name}, Mia is almost always ${ACTIVITIES[corr].name}.`,
      isTrue: true,
      ruleType: 'forward_corr',
      explanation: `True! Under this quantum state, whenever Leo is ${ACTIVITIES[a1].name}, quantum entanglement strongly couples Mia to ${ACTIVITIES[corr].name} in Tokyo (~94% of evenings).`
    });
    poolFalse.push({
      text: `When Leo is ${ACTIVITIES[a1].name}, Mia is almost always ${ACTIVITIES[wrong].name}.`,
      isTrue: false,
      ruleType: 'false_forward_target',
      explanation: `False! When Leo is ${ACTIVITIES[a1].name}, Mia is actually almost always ${ACTIVITIES[corr].name}, not ${ACTIVITIES[wrong].name}.`
    });
  }

  // --- TYPE 2: Reverse Direct Correlation ---
  {
    const corr = inverseMapping[b1];
    const wrong = wrongFor(corr, 4);
    poolTrue.push({
      text: `When Mia is ${ACTIVITIES[b1].name}, Leo is almost always ${ACTIVITIES[corr].name}.`,
      isTrue: true,
      ruleType: 'reverse_corr',
      explanation: `True! Whenever Mia is ${ACTIVITIES[b1].name} in Tokyo, their quantum bond entangles Leo into ${ACTIVITIES[corr].name} in London (~94% of evenings).`
    });
    poolFalse.push({
      text: `When Mia is ${ACTIVITIES[b1].name}, Leo is almost always ${ACTIVITIES[wrong].name}.`,
      isTrue: false,
      ruleType: 'false_reverse_target',
      explanation: `False! When Mia is ${ACTIVITIES[b1].name}, Leo is actually almost always ${ACTIVITIES[corr].name}, not ${ACTIVITIES[wrong].name}.`
    });
  }

  // --- TYPE 3: Negative Exclusion (Forward) ---
  {
    const corr = mapping[a2];
    const other = wrongFor(corr, 2);
    poolTrue.push({
      text: `When Leo is ${ACTIVITIES[a2].name}, Mia is almost never ${ACTIVITIES[other].name}.`,
      isTrue: true,
      ruleType: 'forward_never',
      explanation: `True! When Leo is ${ACTIVITIES[a2].name}, Mia is almost always ${ACTIVITIES[corr].name}—she is almost never ${ACTIVITIES[other].name} (<1% of evenings).`
    });
    poolFalse.push({
      text: `When Leo is ${ACTIVITIES[a2].name}, Mia is almost never ${ACTIVITIES[corr].name}.`,
      isTrue: false,
      ruleType: 'false_deny_corr',
      explanation: `False! In fact, whenever Leo is ${ACTIVITIES[a2].name}, Mia is almost always ${ACTIVITIES[corr].name} (~94% of evenings)!`
    });
  }

  // --- TYPE 4: Negative Exclusion (Reverse) ---
  {
    const corr = inverseMapping[b2];
    const other = wrongFor(corr, 5);
    poolTrue.push({
      text: `When Mia is ${ACTIVITIES[b2].name}, Leo is almost never ${ACTIVITIES[other].name}.`,
      isTrue: true,
      ruleType: 'reverse_never',
      explanation: `True! When Mia is ${ACTIVITIES[b2].name}, Leo is almost always ${ACTIVITIES[corr].name}—he is almost never ${ACTIVITIES[other].name} (<1% of evenings).`
    });
    poolFalse.push({
      text: `When Mia is ${ACTIVITIES[b2].name}, Leo is almost never ${ACTIVITIES[corr].name}.`,
      isTrue: false,
      ruleType: 'false_deny_rev_corr',
      explanation: `False! In fact, whenever Mia is ${ACTIVITIES[b2].name}, Leo is almost always ${ACTIVITIES[corr].name} (~94% of evenings)!`
    });
  }

  // --- TYPE 5: Simultaneous Synchrony / Coincidence ---
  {
    const act = a4;
    const isFixed = (mapping[act] === act);
    if (!isFixed) {
      poolTrue.push({
        text: `Leo and Mia are almost never both ${ACTIVITIES[act].name} on the same evening.`,
        isTrue: true,
        ruleType: 'sync_never',
        explanation: `True! When Leo is ${ACTIVITIES[act].name}, Mia is almost always ${ACTIVITIES[mapping[act]].name}—they are almost never both ${ACTIVITIES[act].name} together.`
      });
      poolFalse.push({
        text: `Whenever Leo is ${ACTIVITIES[act].name}, Mia is also ${ACTIVITIES[act].name}.`,
        isTrue: false,
        ruleType: 'false_sync_always',
        explanation: `False! When Leo is ${ACTIVITIES[act].name}, Mia is actually almost always ${ACTIVITIES[mapping[act]].name}, not ${ACTIVITIES[act].name}.`
      });
    } else {
      poolTrue.push({
        text: `Whenever Leo is ${ACTIVITIES[act].name}, Mia is also ${ACTIVITIES[act].name}.`,
        isTrue: true,
        ruleType: 'sync_always',
        explanation: `True! Under this entangled state, whenever Leo is ${ACTIVITIES[act].name}, Mia is also ${ACTIVITIES[act].name} (~94% of evenings).`
      });
      poolFalse.push({
        text: `Leo and Mia are almost never both ${ACTIVITIES[act].name} on the same evening.`,
        isTrue: false,
        ruleType: 'false_sync_never',
        explanation: `False! In fact, when Leo is ${ACTIVITIES[act].name}, Mia is almost always ${ACTIVITIES[act].name} as well!`
      });
    }
  }

  // --- TYPE 6: Mutual Exclusion of Pairs ---
  {
    const corr = mapping[a5];
    const other = wrongFor(corr, 3);
    poolTrue.push({
      text: `Leo ${ACTIVITIES[a5].name} and Mia ${ACTIVITIES[other].name} almost never occur on the same evening.`,
      isTrue: true,
      ruleType: 'pair_never',
      explanation: `True! Leo ${ACTIVITIES[a5].name} couples to Mia ${ACTIVITIES[corr].name}, so Leo ${ACTIVITIES[a5].name} and Mia ${ACTIVITIES[other].name} almost never coincide.`
    });
    poolFalse.push({
      text: `Leo ${ACTIVITIES[a5].name} and Mia ${ACTIVITIES[corr].name} almost never occur on the same evening.`,
      isTrue: false,
      ruleType: 'false_pair_never',
      explanation: `False! In fact, Leo ${ACTIVITIES[a5].name} and Mia ${ACTIVITIES[corr].name} are entangled partners and almost always coincide (~94% of evenings)!`
    });
  }

  // --- TYPE 7: Alternative Possibility (Forward Disjunction) ---
  {
    const corr = mapping[a6];
    const extra = wrongFor(corr, 2);
    const wrong1 = wrongFor(corr, 4);
    let wrong2 = wrongFor(corr, 6);
    if (wrong2 === wrong1) wrong2 = (wrong1 + 1) % 8;
    if (wrong2 === corr) wrong2 = (wrong2 + 1) % 8;

    poolTrue.push({
      text: `When Leo is ${ACTIVITIES[a6].name}, Mia is almost always either ${ACTIVITIES[corr].name} or ${ACTIVITIES[extra].name}.`,
      isTrue: true,
      ruleType: 'disjunction_forward',
      explanation: `True! When Leo is ${ACTIVITIES[a6].name}, Mia is almost always ${ACTIVITIES[corr].name}, which fulfills this observation.`
    });
    poolFalse.push({
      text: `When Leo is ${ACTIVITIES[a6].name}, Mia is almost always either ${ACTIVITIES[wrong1].name} or ${ACTIVITIES[wrong2].name}.`,
      isTrue: false,
      ruleType: 'false_disjunction_forward',
      explanation: `False! When Leo is ${ACTIVITIES[a6].name}, Mia is actually almost always ${ACTIVITIES[corr].name}, neither of those two.`
    });
  }

  // --- TYPE 8: Activity Preclusion (Other Than) ---
  {
    const corr = mapping[a7];
    const other = wrongFor(corr, 4);
    poolTrue.push({
      text: `When Leo is ${ACTIVITIES[a7].name}, Mia is almost always engaged in an activity other than ${ACTIVITIES[other].name}.`,
      isTrue: true,
      ruleType: 'other_than_forward',
      explanation: `True! When Leo is ${ACTIVITIES[a7].name}, Mia is almost always ${ACTIVITIES[corr].name}, so she is virtually never ${ACTIVITIES[other].name}.`
    });
    poolFalse.push({
      text: `When Leo is ${ACTIVITIES[a7].name}, Mia is almost always engaged in an activity other than ${ACTIVITIES[corr].name}.`,
      isTrue: false,
      ruleType: 'false_other_than_forward',
      explanation: `False! When Leo is ${ACTIVITIES[a7].name}, Mia is almost always ${ACTIVITIES[corr].name}—that is precisely what she is doing!`
    });
  }

  // --- TYPE 9: Reverse Disjunction ---
  {
    const corr = inverseMapping[b3];
    const extra = wrongFor(corr, 3);
    const wrong1 = wrongFor(corr, 2);
    let wrong2 = wrongFor(corr, 5);
    if (wrong2 === wrong1) wrong2 = (wrong1 + 1) % 8;
    if (wrong2 === corr) wrong2 = (wrong2 + 1) % 8;

    poolTrue.push({
      text: `When Mia is ${ACTIVITIES[b3].name}, Leo is almost always either ${ACTIVITIES[corr].name} or ${ACTIVITIES[extra].name}.`,
      isTrue: true,
      ruleType: 'disjunction_reverse',
      explanation: `True! When Mia is ${ACTIVITIES[b3].name}, Leo is almost always ${ACTIVITIES[corr].name}, which fulfills this observation.`
    });
    poolFalse.push({
      text: `When Mia is ${ACTIVITIES[b3].name}, Leo is almost always either ${ACTIVITIES[wrong1].name} or ${ACTIVITIES[wrong2].name}.`,
      isTrue: false,
      ruleType: 'false_disjunction_reverse',
      explanation: `False! When Mia is ${ACTIVITIES[b3].name}, Leo is actually almost always ${ACTIVITIES[corr].name}, neither of those two.`
    });
  }

  // --- TYPE 10: Additional Forward Correlation with Distinct Activity ---
  {
    const corr = mapping[a8];
    const wrong = wrongFor(corr, 5);
    poolTrue.push({
      text: `When Leo is ${ACTIVITIES[a8].name}, Mia is almost always ${ACTIVITIES[corr].name}.`,
      isTrue: true,
      ruleType: 'forward_corr_2',
      explanation: `True! Whenever Leo is ${ACTIVITIES[a8].name}, Mia is almost always ${ACTIVITIES[corr].name} across the 9,560 km.`
    });
    poolFalse.push({
      text: `When Leo is ${ACTIVITIES[a8].name}, Mia is almost always ${ACTIVITIES[wrong].name}.`,
      isTrue: false,
      ruleType: 'false_forward_target_2',
      explanation: `False! When Leo is ${ACTIVITIES[a8].name}, Mia is actually almost always ${ACTIVITIES[corr].name}, not ${ACTIVITIES[wrong].name}.`
    });
  }

  return { poolTrue, poolFalse };
}

/**
 * Generates an 8-statement Field Notebook page (4 True, 4 False)
 * from the diverse 20-question roster using the selection seed.
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

  // Pick 4 True and 4 False statements (total 8) for balanced, diverse deduction
  const selected = [
    shuffledTrue[0],
    shuffledTrue[1],
    shuffledTrue[2],
    shuffledTrue[3],
    shuffledFalse[0],
    shuffledFalse[1],
    shuffledFalse[2],
    shuffledFalse[3]
  ];

  const ordered = shuffle(selected);

  return ordered.map((st, index) => ({
    id: index,
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
