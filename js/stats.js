/**
 * stats.js - Quantum Correlation Statement Builder & Evaluator
 * 
 * Defines legitimate, sensible Field Notebook deduction questions about Leo and Mia.
 * Leo and Mia are entangled across this vast distance on qubits (0, 2):
 * - Qubits 0 & 2 are 100% correlated: their overall moods (Quiet vs Active) ALWAYS match.
 * - Qubits 1 & 3 are 50/50 uncoupled: their specific activity within that mood is an independent coin flip.
 * 
 * Ground truth rules are 100% absolute (True or False, no fuzzy probabilities):
 * - All pool questions are sensible, legitimate statements about Leo and Mia.
 * - Each playthrough selects 5 questions (balanced 3 True, 2 False).
 * - Restarting with a new investigation provides a fresh legitimate logbook page!
 */

import { mulberry32 } from './atlas.js';

export const ACTIVITIES = [
  { code: 0, bits: '00', name: 'in bed', label: 'in bed' },
  { code: 1, bits: '01', name: 'thinking', label: 'thinking' },
  { code: 2, bits: '10', name: 'playing a game', label: 'playing a game' },
  { code: 3, bits: '11', name: 'cooking', label: 'cooking' }
];

/**
 * Computes frequency stats over all observed shots in the batch
 */
export function computeStatistics(shots) {
  const total = shots.length;
  const countA = [0, 0, 0, 0];
  const countB = [0, 0, 0, 0];
  const countAB = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  for (const s of shots) {
    const a = parseInt(s.slice(0, 2), 2);
    const b = parseInt(s.slice(2, 4), 2);
    countA[a]++;
    countB[b]++;
    countAB[a][b]++;
  }

  // Mood groupings:
  // Quiet: in bed (0) or thinking (1) [b0 / b2 = 0]
  // Active: playing a game (2) or cooking (3) [b0 / b2 = 1]
  const aRest = countA[0] + countA[1];
  const aActive = countA[2] + countA[3];
  const bRest = countB[0] + countB[1];
  const bActive = countB[2] + countB[3];

  const abRestRest = countAB[0][0] + countAB[0][1] + countAB[1][0] + countAB[1][1];
  const abActiveActive = countAB[2][2] + countAB[2][3] + countAB[3][2] + countAB[3][3];

  return {
    total,
    countA,
    countB,
    countAB,
    aRest,
    aActive,
    bRest,
    bActive,
    abRestRest,
    abActiveActive
  };
}

/**
 * Sensible, legitimate pool of absolute statements about Leo and Mia
 */
export const POOL_TRUE = [
  {
    text: 'When Leo is cooking, Mia is never in bed.',
    isTrue: true,
    ruleType: 'never',
    explanation: 'True! Cooking is Leo’s active mood. Because they are entangled across this vast distance, Mia is also active (playing a game or cooking) and is never in bed.'
  },
  {
    text: 'When Leo is in bed or thinking, Mia is always in bed or thinking.',
    isTrue: true,
    ruleType: 'always_group',
    explanation: 'True! In bed and thinking share the quiet mood. When Leo is in bed or thinking, Mia is always in bed or thinking too across the vast distance.'
  },
  {
    text: 'When Mia is playing a game, Leo is always playing a game or cooking.',
    isTrue: true,
    ruleType: 'always_group',
    explanation: 'True! When Mia is playing a game, she is active. Quantum entanglement across this vast distance guarantees Leo is also active (playing a game or cooking).'
  },
  {
    text: 'When Leo is thinking, Mia is always in bed or thinking.',
    isTrue: true,
    ruleType: 'either_or',
    explanation: 'True! Thinking is part of Leo’s quiet mood. Because they are entangled across this vast distance, Mia is always in bed or thinking.'
  },
  {
    text: 'When Mia is cooking, Leo is never in bed.',
    isTrue: true,
    ruleType: 'never',
    explanation: 'True! When Mia is cooking, she is active. Because they are entangled across this vast distance, Leo is also active and is never in bed.'
  },
  {
    text: 'When Leo is in bed, Mia is never cooking.',
    isTrue: true,
    ruleType: 'never',
    explanation: 'True! When Leo is in bed, Mia is always in bed or thinking. Because they are entangled across this vast distance, Mia is never cooking.'
  },
  {
    text: 'When Leo is playing a game, Mia is never thinking.',
    isTrue: true,
    ruleType: 'never',
    explanation: 'True! When Leo is playing a game, he is active. Because they are entangled across this vast distance, Mia is always playing a game or cooking, never thinking.'
  }
];

export const POOL_FALSE = [
  {
    text: 'When Leo is cooking, Mia is always in bed.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! When Leo is cooking, Mia is never in bed. Because they are entangled across this vast distance, Mia is always playing a game or cooking.'
  },
  {
    text: 'When Mia is playing a game, Leo is always in bed.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! When Mia is playing a game, she is active. Because they are entangled across this vast distance, Leo is always playing a game or cooking, never in bed.'
  },
  {
    text: 'When Leo is in bed, Mia is always cooking.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! When Leo is in bed, Mia is never cooking. Because they are entangled across this vast distance, Mia is always in bed or thinking.'
  },
  {
    text: 'When Mia is thinking, Leo is always cooking.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! Thinking is part of Mia’s quiet mood. Because they are entangled across this vast distance, Leo is always in bed or thinking, never cooking.'
  },
  {
    text: 'When Leo is playing a game, Mia is always in bed.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! When Leo is playing a game, he is active. Because they are entangled across this vast distance, Mia is always playing a game or cooking, never in bed.'
  },
  {
    text: 'When Leo is in bed or thinking, Mia is always playing a game or cooking.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! Their moods match. When Leo is in bed or thinking, Mia is always in bed or thinking, never playing a game or cooking.'
  }
];

/**
 * Generates a fresh, legitimate 5-item Field Notebook page from the question pool.
 * Seeded so each investigation level has a coherent, reproducible set.
 */
export function generateStatementList(seed = 7) {
  const rng = mulberry32(seed);

  // Fisher-Yates shuffle helper
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

  const shuffledTrue = shuffle(POOL_TRUE);
  const shuffledFalse = shuffle(POOL_FALSE);

  // Pick 3 True and 2 False statements
  const selected = [
    shuffledTrue[0],
    shuffledTrue[1],
    shuffledTrue[2],
    shuffledFalse[0],
    shuffledFalse[1]
  ];

  // Shuffle order of the 5 statements
  const ordered = shuffle(selected);

  return ordered.map((st, index) => ({
    ...st,
    id: index
  }));
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
