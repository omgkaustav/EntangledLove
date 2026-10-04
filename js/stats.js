/**
 * stats.js - Quantum Correlation Statement Builder & Evaluator
 * 
 * Defines the fixed, unambiguous 5-item Field Notebook deductions.
 * Leo and Mia are entangled in an exact Bell state on qubits (0, 2):
 * - Qubit 0 & Qubit 2 are 100% correlated: their overall moods (resting vs active) ALWAYS match.
 * - Qubits 1 & 3 are 50/50 uncoupled: their specific activity within that mood is an independent coin flip.
 * 
 * Ground truth rules are 100% absolute (True or False, no fuzzy 85% decimals):
 * - 3 True statements, 2 False statements.
 * - Questions are permanently fixed for this level/chapter.
 */

export const ACTIVITIES = [
  { code: 0, bits: '00', name: 'in bed', label: 'resting in bed' },
  { code: 1, bits: '01', name: 'thinking', label: 'thinking of the other' },
  { code: 2, bits: '10', name: 'playing a game', label: 'playing a game' },
  { code: 3, bits: '11', name: 'cooking', label: 'cooking dinner' }
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
  // Resting: bed (0) or thinking (1) [b0 / b2 = 0]
  // Active:  gaming (2) or cooking (3) [b0 / b2 = 1]
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
 * Fixed 5 deduction items for the Field Notebook.
 * Completely deterministic and stable (no random reshuffling).
 */
export const FIXED_STATEMENTS = [
  {
    id: 0,
    text: 'When Leo is cooking, Mia is never in bed.',
    isTrue: true,
    ruleType: 'never',
    explanation: 'True! Cooking is Leo’s active mood. Because their moods are 100% entangled in a Bell state, Mia is also active (gaming or cooking) and is never asleep in bed.'
  },
  {
    id: 1,
    text: 'When Leo is in bed or thinking, Mia is always in bed or thinking.',
    isTrue: true,
    ruleType: 'always_group',
    explanation: 'True! Resting in bed and thinking share the quiet mood. Whenever Leo rests, Mia is always resting too across the 9,560 km.'
  },
  {
    id: 2,
    text: 'When Mia is playing a game, Leo is always in bed.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! Gaming is Mia’s active mood. Quantum correlation guarantees Leo is also active (gaming or cooking), never asleep in bed.'
  },
  {
    id: 3,
    text: 'When Leo is thinking of Mia, Mia is always either in bed or thinking.',
    isTrue: true,
    ruleType: 'either_or',
    explanation: 'True! Thinking is part of the resting mood. Mia is strictly bound to resting activities: either also thinking of Leo, or resting in bed.'
  },
  {
    id: 4,
    text: 'When Leo is in bed, Mia is always cooking.',
    isTrue: false,
    ruleType: 'false_opposite',
    explanation: 'False! When Leo is in bed, Mia is never in her kitchen cooking. She is always in bed or thinking.'
  }
];

/**
 * Returns the fixed 5-item statement list
 */
export function generateStatementList() {
  return FIXED_STATEMENTS.map(st => ({ ...st }));
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
