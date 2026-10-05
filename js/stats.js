/**
 * stats.js - 6-Qubit Quantum State Engine & Dynamic Field Notebook Generator
 * 
 * Manages 6-qubit quantum states (3 qubits for Leo, 3 qubits for Mia):
 * - 8 distinct nocturnal activities for each person (2^3 = 8).
 * - Real hardware fidelity (0.94 target correlation + 0.06 readout noise).
 * - Seeded system with 24 distinct quantum state archetypes.
 * - Dynamic generation of 10-statement rosters (with "almost always" / "almost never").
 * - Sub-selection of 5 balanced questions per investigation for high replayability.
 */

import { mulberry32 } from './atlas.js';

export const ACTIVITIES = [
  { code: 0, bits: '000', name: 'in bed', label: 'in bed', mood: 'quiet' },
  { code: 1, bits: '001', name: 'thinking', label: 'thinking', mood: 'quiet' },
  { code: 2, bits: '010', name: 'reading', label: 'reading', mood: 'quiet' },
  { code: 3, bits: '011', name: 'listening to music', label: 'listening to music', mood: 'quiet' },
  { code: 4, bits: '100', name: 'playing a game', label: 'playing a game', mood: 'active' },
  { code: 5, bits: '101', name: 'cooking', label: 'cooking', mood: 'active' },
  { code: 6, bits: '110', name: 'watering plants', label: 'watering plants', mood: 'active' },
  { code: 7, bits: '111', name: 'stargazing', label: 'stargazing', mood: 'active' }
];

export const QUIET_CODES = [0, 1, 2, 3];
export const ACTIVE_CODES = [4, 5, 6, 7];

export const QUIET_GROUP_LABEL = 'a quiet activity (in bed, thinking, reading, or listening to music)';
export const ACTIVE_GROUP_LABEL = 'an active activity (playing a game, cooking, watering plants, or stargazing)';

/**
 * Catalogue of 24 distinct quantum state configurations
 */
export function getQuantumStateConfig(seed = 1) {
  // Normalize seed to 1..24
  const id = ((Math.abs(Math.floor(seed)) - 1) % 24) + 1;
  const rng = mulberry32(id * 7919);

  // Coupling parameters:
  // moodCoupling: +1 (synchronized moods: quiet<->quiet, active<->active) or -1 (inverted moods: quiet<->active)
  // parityCoupling: +1 (bit 1 aligns with bit 4), -1 (inverts), or 0 (independent)
  // focusCoupling: +1 (bit 2 aligns with bit 5), -1 (inverts), or 0 (independent)
  // fidelity: realistic measurement noise on real quantum hardware (e.g. 0.94)

  const moodCoupling = id <= 12 ? +1 : -1;
  
  let parityCoupling = 0;
  if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].includes(id)) {
    parityCoupling = id % 4 === 0 ? -1 : +1;
  }

  let focusCoupling = 0;
  if ([3, 6, 9, 12, 15, 18, 21, 24].includes(id)) {
    focusCoupling = id % 6 === 0 ? -1 : +1;
  }

  const titles = [
    'Synchronized Nights', 'Harmonic Echo', 'Contemplative Resonance',
    'Chamber Harmony', 'Dual Meridian', 'Mirror Symmetry',
    'Counterpoint Pulse', 'Opposite Phase', 'Cross-Hemisphere Shift',
    'Night Owl Inverse', 'Shadow Orbit', 'Inverse Parity',
    'Starlight Telepathy', 'Resonant Frequencies', 'Twin Constellations',
    'Acoustic Wave', 'Silent Meridian', 'Deep Space Entanglement',
    'Quantum Nocturne', 'Entangled Horizon', 'Cosmic Pendulum',
    'Tokyo-London Continuum', 'Ethereal Chord', 'Unified Phase'
  ];

  return {
    id,
    title: titles[id - 1] || `State #${id}`,
    moodCoupling,
    parityCoupling,
    focusCoupling,
    fidelity: 0.94 // 94% quantum correlation fidelity, 6% realistic readout noise
  };
}

/**
 * Calculates the exact 8x8 joint probability distribution P[a][b] for a given quantum state
 */
export function computeTheoreticalDistribution(config) {
  const P = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const { moodCoupling, parityCoupling, focusCoupling, fidelity } = config;
  const noise = 1.0 - fidelity;

  for (let a = 0; a < 8; a++) {
    const a0 = (a >> 2) & 1;
    const a1 = (a >> 1) & 1;
    const a2 = a & 1;

    for (let b = 0; b < 8; b++) {
      const b0 = (b >> 2) & 1;
      const b1 = (b >> 1) & 1;
      const b2 = b & 1;

      // Base probability of a (uniform 1/8)
      let prob = 1 / 8;

      // Conditional probability of b0 given a0
      const targetB0 = moodCoupling === +1 ? a0 : 1 - a0;
      prob *= (b0 === targetB0 ? fidelity : noise);

      // Conditional probability of b1 given a1
      if (parityCoupling === +1) {
        prob *= (b1 === a1 ? fidelity : noise);
      } else if (parityCoupling === -1) {
        prob *= (b1 === (1 - a1) ? fidelity : noise);
      } else {
        prob *= 0.5; // independent
      }

      // Conditional probability of b2 given a2
      if (focusCoupling === +1) {
        prob *= (b2 === a2 ? fidelity : noise);
      } else if (focusCoupling === -1) {
        prob *= (b2 === (1 - a2) ? fidelity : noise);
      } else {
        prob *= 0.5; // independent
      }

      P[a][b] = prob;
    }
  }

  return P;
}

/**
 * Build a roster of 10 candidate statements (5 True, 5 False) tailored to the quantum state
 */
export function buildQuestionRoster(config) {
  const P = computeTheoreticalDistribution(config);
  const { moodCoupling, fidelity } = config;

  // Helper to query theoretical conditional probabilities
  function pMiaGivenLeo(leoCode, miaCodeList) {
    let num = 0;
    let den = 0;
    for (let b = 0; b < 8; b++) {
      den += P[leoCode][b];
      if (miaCodeList.includes(b)) num += P[leoCode][b];
    }
    return den > 0 ? num / den : 0;
  }

  function pLeoGivenMia(miaCode, leoCodeList) {
    let num = 0;
    let den = 0;
    for (let a = 0; a < 8; a++) {
      den += P[a][miaCode];
      if (leoCodeList.includes(a)) num += P[a][miaCode];
    }
    return den > 0 ? num / den : 0;
  }

  const isMoodSync = moodCoupling === +1;
  const candidateTrue = [];
  const candidateFalse = [];

  if (isMoodSync) {
    // Synchronized moods: Quiet <-> Quiet, Active <-> Active

    // True Statements
    candidateTrue.push({
      text: 'When Leo is cooking, Mia is almost never in bed.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Cooking is Leo’s active mood. Under this quantum state, Mia almost always shares his active mood (playing a game, cooking, watering plants, or stargazing) and is almost never in bed.'
    });

    candidateTrue.push({
      text: `When Leo is in bed, Mia is almost always doing ${QUIET_GROUP_LABEL}.`,
      isTrue: true,
      ruleType: 'always_group',
      explanation: 'True! Being in bed belongs to Leo’s quiet mood. Quantum entanglement guarantees Mia almost always shares this quiet mood across the 9,560 km.'
    });

    candidateTrue.push({
      text: 'When Mia is stargazing, Leo is almost never reading.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Stargazing is an active activity, while reading is a quiet activity. Their moods are positively entangled, so Leo is almost always active too.'
    });

    candidateTrue.push({
      text: `When Mia is playing a game, Leo is almost always doing ${ACTIVE_GROUP_LABEL}.`,
      isTrue: true,
      ruleType: 'always_group',
      explanation: 'True! Mia’s gaming places her in the active mood. Entanglement ensures Leo is almost always engaged in active evening routines in London.'
    });

    candidateTrue.push({
      text: 'When Leo is watering plants, Mia is almost never thinking.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Watering plants is active, whereas thinking is part of the quiet mood. Due to positive mood coupling, Mia is almost always active.'
    });

    candidateTrue.push({
      text: 'When Mia is listening to music, Leo is almost never cooking.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Listening to music is a quiet activity. Because their moods synchronize, Leo is almost always in his quiet mood, never in the kitchen.'
    });

    // False Statements
    candidateFalse.push({
      text: 'When Leo is cooking, Mia is almost always in bed.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! Leo’s cooking indicates an active mood. Mia almost always synchronizes into an active activity, not sleeping in bed.'
    });

    candidateFalse.push({
      text: 'When Mia is stargazing, Leo is almost always in bed.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! Stargazing is an active mood. Entanglement guarantees Leo is almost always active too, not in bed.'
    });

    candidateFalse.push({
      text: `When Leo is in bed, Mia is almost always doing ${ACTIVE_GROUP_LABEL}.`,
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! Their moods are synchronized, not inverted. When Leo is in bed, Mia is almost always engaged in quiet activities.'
    });

    candidateFalse.push({
      text: 'When Mia is reading, Leo is almost always playing a game.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! Reading is a quiet activity, whereas playing a game is active. Because moods align, Leo is almost always in his quiet mood.'
    });

    candidateFalse.push({
      text: 'When Leo is watering plants, Mia is almost always thinking.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! Watering plants is active. Mia is bound to active activities, not daydreaming in her quiet mood.'
    });

  } else {
    // Inverted moods: Quiet <-> Active (Counterpoint / Night-shift)

    // True Statements
    candidateTrue.push({
      text: `When Leo is in bed, Mia is almost always doing ${ACTIVE_GROUP_LABEL}.`,
      isTrue: true,
      ruleType: 'always_group_inverted',
      explanation: 'True! Under this counterpoint quantum state, Leo and Mia have inverted moods: when Leo rests in bed, Mia is almost always active in Tokyo.'
    });

    candidateTrue.push({
      text: 'When Leo is cooking, Mia is almost never playing a game.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Cooking is Leo’s active mood. Under this inverted state, Mia is almost always in her quiet mood, so she is almost never playing a game.'
    });

    candidateTrue.push({
      text: `When Mia is reading, Leo is almost always doing ${ACTIVE_GROUP_LABEL}.`,
      isTrue: true,
      ruleType: 'always_group_inverted',
      explanation: 'True! Mia’s reading is a quiet activity. Their inverted quantum bond dictates that Leo is almost always active in London.'
    });

    candidateTrue.push({
      text: 'When Mia is stargazing, Leo is almost never watering plants.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Stargazing is active. Due to mood inversion, Leo is almost always in his quiet mood, not tending plants.'
    });

    candidateTrue.push({
      text: 'When Leo is thinking, Mia is almost never listening to music.',
      isTrue: true,
      ruleType: 'never_cross_mood',
      explanation: 'True! Thinking is quiet. In this state, Mia is almost always active, so she is almost never in quiet activities like listening to music.'
    });

    // False Statements
    candidateFalse.push({
      text: `When Leo is in bed, Mia is almost always doing ${QUIET_GROUP_LABEL}.`,
      isTrue: false,
      ruleType: 'false_sync',
      explanation: 'False! This quantum state features inverted moods: when Leo rests, Mia is almost always active across Tokyo.'
    });

    candidateFalse.push({
      text: 'When Leo is cooking, Mia is almost always stargazing.',
      isTrue: false,
      ruleType: 'false_sync',
      explanation: 'False! Leo is active, which entangles Mia into her quiet mood (in bed, thinking, reading, or music), never stargazing.'
    });

    candidateFalse.push({
      text: 'When Mia is playing a game, Leo is almost always cooking.',
      isTrue: false,
      ruleType: 'false_sync',
      explanation: 'False! Mia’s active gaming induces Leo into his quiet mood. He is almost never in the kitchen cooking.'
    });

    candidateFalse.push({
      text: 'When Leo is reading, Mia is almost always reading.',
      isTrue: false,
      ruleType: 'false_sync',
      explanation: 'False! Their moods complement each other. When Leo reads quietly, Mia is almost always in her active mood.'
    });

    candidateFalse.push({
      text: 'When Mia is in bed, Leo is almost always in bed.',
      isTrue: false,
      ruleType: 'false_sync',
      explanation: 'False! Under this inverted state, one sleeps while the other is active. When Mia is in bed, Leo is almost always active.'
    });
  }

  // Return the roster of 10 items (5 true, 5 false)
  return {
    poolTrue: candidateTrue.slice(0, 5),
    poolFalse: candidateFalse.slice(0, 5)
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
    ...st,
    id: index,
    stateTitle: config.title
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

  // Mood groupings:
  // Quiet: 0, 1, 2, 3
  // Active: 4, 5, 6, 7
  const aQuiet = countA[0] + countA[1] + countA[2] + countA[3];
  const aActive = countA[4] + countA[5] + countA[6] + countA[7];
  const bQuiet = countB[0] + countB[1] + countB[2] + countB[3];
  const bActive = countB[4] + countB[5] + countB[6] + countB[7];

  return {
    total,
    countA,
    countB,
    countAB,
    aQuiet,
    aActive,
    bQuiet,
    bActive
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
