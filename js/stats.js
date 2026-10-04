/**
 * stats.js - Quantum Correlation Statement Builder (Simplified 5-Item Checklist)
 * 
 * Computes empirical correlations across the 16 observed days and generates
 * 5 natural, low-cognitive-load statements using clear quantum patterns:
 * - "This never happens with this."
 * - "When this happens, this always happens."
 * - "When this happens, either this or this happens."
 * 
 * Exactly 5 statements: balanced 3 True / 2 False (or 2 True / 3 False).
 */

import { mulberry32 } from './atlas.js';

export const ACTIVITIES = [
  { code: 0, bits: '00', name: 'in bed', label: 'resting in bed' },
  { code: 1, bits: '01', name: 'thinking', label: 'thinking of the other' },
  { code: 2, bits: '10', name: 'playing a game', label: 'playing a game' },
  { code: 3, bits: '11', name: 'cooking', label: 'cooking' }
];

/**
 * Computes frequency stats over the current 16 days (or full batch)
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

  // Grouped counts:
  // Rest = 0 (bed) or 1 (thinking) [bit 0 / bit 2 = 0]
  // Active = 2 (playing) or 3 (cooking) [bit 0 / bit 2 = 1]
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
 * Generates exactly 5 simplified, qualitative statements (3 True, 2 False or vice-versa)
 * based on quantum correlation rules from the batch.
 */
export function generateStatementList(stats, seed = 7) {
  const rng = mulberry32(seed + 42);

  // Pool of TRUE statement candidates
  const poolTrue = [
    {
      id: 't1',
      text: 'When Leo is cooking, Mia is never in bed.',
      isTrue: true,
      ruleType: 'never',
      explanation: 'Accurate! Cooking means Leo is in the active phase (bit 0 = 1). Entanglement on qubits (0, 2) ensures Mia is also active (gaming or cooking) and is never asleep.'
    },
    {
      id: 't2',
      text: 'When Leo is in bed or thinking, Mia is always in bed or thinking.',
      isTrue: true,
      ruleType: 'always_group',
      explanation: 'Accurate! Resting modes share bit 0 = 0. The quantum graph state keeps both lovers synchronized in resting activities.'
    },
    {
      id: 't3',
      text: 'When Mia is playing a game, Leo is always playing or cooking.',
      isTrue: true,
      ruleType: 'always_group',
      explanation: 'Accurate! When Mia is gaming (bit 2 = 1), quantum correlation ensures Leo is also active in his flat (playing or cooking, bit 0 = 1).'
    },
    {
      id: 't4',
      text: 'When Leo is thinking of Mia, Mia is either in bed or thinking.',
      isTrue: true,
      ruleType: 'either_or',
      explanation: 'Accurate! Thinking sets bit 0 = 0. Therefore Mia is always in her resting mode: either asleep in bed or also thinking of Leo.'
    },
    {
      id: 't5',
      text: 'When Leo is in bed, Mia is never cooking.',
      isTrue: true,
      ruleType: 'never',
      explanation: 'Accurate! When Leo is resting in bed (bit 0 = 0), Mia is coupled to resting states and never stirs the pot in her kitchen.'
    },
    {
      id: 't6',
      text: 'When Mia is cooking, Leo is either playing a game or cooking.',
      isTrue: true,
      ruleType: 'either_or',
      explanation: 'Accurate! When Mia cooks (bit 2 = 1), Leo is in the coupled active phase: either gaming or cooking.'
    }
  ];

  // Pool of FALSE statement candidates
  const poolFalse = [
    {
      id: 'f1',
      text: 'When Leo is cooking, Mia is always in bed.',
      isTrue: false,
      ruleType: 'false_always',
      explanation: 'False! In reality, when Leo is cooking, Mia is never in bed. They are correlated in the active phase (cooking or gaming).'
    },
    {
      id: 'f2',
      text: 'When Leo is in bed or thinking, Mia is always playing a game or cooking.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! The lovers are positively correlated, not opposite. When Leo is resting, Mia is also resting in bed or thinking.'
    },
    {
      id: 'f3',
      text: 'When Mia is playing a game, Leo is always in bed.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! When Mia is gaming, Leo is active (playing or cooking), never asleep in bed.'
    },
    {
      id: 'f4',
      text: 'When Leo is in bed, Mia is always cooking.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! When Leo is in bed, Mia is never cooking. Mia is always resting in bed or thinking.'
    },
    {
      id: 'f5',
      text: 'When Mia is in bed, Leo is always playing a game.',
      isTrue: false,
      ruleType: 'false_opposite',
      explanation: 'False! When Mia is in bed, Leo is never playing games. Leo is resting in bed or thinking.'
    }
  ];

  // Shuffle pools
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  shuffle(poolTrue);
  shuffle(poolFalse);

  // Pick 3 True and 2 False (Total exactly 5 statements)
  const selected = [
    poolTrue[0],
    poolTrue[1],
    poolTrue[2],
    poolFalse[0],
    poolFalse[1]
  ];

  shuffle(selected);

  // Assign clean sequential IDs
  return selected.map((st, index) => ({
    ...st,
    id: index
  }));
}

/**
 * Score the 5 statements
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
