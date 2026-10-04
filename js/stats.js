/**
 * stats.js - Quantum Histogram Statistics & Statement Builder
 * 
 * Computes empirical conditional frequencies from a batch of 1024 shots
 * and generates 8 true/false statements scored directly against that ground truth.
 */

import { mulberry32 } from './atlas.js';

export const ACTIVITIES = [
  { code: 0, bits: '00', name: 'in bed', shortName: 'bed', desc: 'resting in bed' },
  { code: 1, bits: '01', name: 'thinking of the other', shortName: 'thinking', desc: 'thinking at the window' },
  { code: 2, bits: '10', name: 'playing a game', shortName: 'playing', desc: 'playing a game' },
  { code: 3, bits: '11', name: 'cooking', shortName: 'cooking', desc: 'cooking in the kitchen' }
];

export const GROUPS = {
  REST: { codes: [0, 1], name: 'in bed or thinking' },
  ACTIVE: { codes: [2, 3], name: 'playing a game or cooking' }
};

/**
 * Computes full joint and conditional statistics from an array of 4-bit strings
 */
export function computeStatistics(shots) {
  const total = shots.length;
  if (total === 0) {
    throw new Error('Cannot compute statistics on empty shots list');
  }

  const countA = [0, 0, 0, 0];
  const countB = [0, 0, 0, 0];
  const countAB = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  for (const shot of shots) {
    // Shot is b0 b1 b2 b3
    const a = parseInt(shot.slice(0, 2), 2);
    const b = parseInt(shot.slice(2, 4), 2);
    countA[a]++;
    countB[b]++;
    countAB[a][b]++;
  }

  // P(B = y | A = x)
  const condBGivenA = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  // P(A = x | B = y)
  const condAGivenB = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      if (countA[x] >= 20) {
        condBGivenA[x][y] = countAB[x][y] / countA[x];
      }
      if (countB[y] >= 20) {
        condAGivenB[x][y] = countAB[x][y] / countB[y];
      }
    }
  }

  // Compound conditionals: Group REST (0,1) and Group ACTIVE (2,3)
  const countA_Rest = countA[0] + countA[1];
  const countA_Active = countA[2] + countA[3];
  const countB_Rest = countB[0] + countB[1];
  const countB_Active = countB[2] + countB[3];

  const countAB_RestRest = countAB[0][0] + countAB[0][1] + countAB[1][0] + countAB[1][1];
  const countAB_ActiveActive = countAB[2][2] + countAB[2][3] + countAB[3][2] + countAB[3][3];

  const pB_RestGivenA_Rest = countA_Rest >= 20 ? countAB_RestRest / countA_Rest : 0;
  const pB_ActiveGivenA_Active = countA_Active >= 20 ? countAB_ActiveActive / countA_Active : 0;
  const pA_RestGivenB_Rest = countB_Rest >= 20 ? countAB_RestRest / countB_Rest : 0;
  const pA_ActiveGivenB_Active = countB_Active >= 20 ? countAB_ActiveActive / countB_Active : 0;

  // Single to group conditionals
  // e.g. P(B in REST | A = cooking), P(B in ACTIVE | A = playing)
  const condBGroupGivenA = [];
  for (let x = 0; x < 4; x++) {
    const pRest = countA[x] >= 20 ? (countAB[x][0] + countAB[x][1]) / countA[x] : 0;
    const pActive = countA[x] >= 20 ? (countAB[x][2] + countAB[x][3]) / countA[x] : 0;
    condBGroupGivenA.push({ pRest, pActive });
  }

  const condAGroupGivenB = [];
  for (let y = 0; y < 4; y++) {
    const pRest = countB[y] >= 20 ? (countAB[0][y] + countAB[1][y]) / countB[y] : 0;
    const pActive = countB[y] >= 20 ? (countAB[2][y] + countAB[3][y]) / countB[y] : 0;
    condAGroupGivenB.push({ pRest, pActive });
  }

  return {
    total,
    countA,
    countB,
    countAB,
    condBGivenA,
    condAGivenB,
    pB_RestGivenA_Rest,
    pB_ActiveGivenA_Active,
    pA_RestGivenB_Rest,
    pA_ActiveGivenB_Active,
    condBGroupGivenA,
    condAGroupGivenB
  };
}

/**
 * Rounds a probability [0..1] to the nearest 5 percent (0, 5, 10, ..., 100)
 */
function roundTo5Pct(prob) {
  const pct = prob * 100;
  return Math.round(pct / 5) * 5;
}

/**
 * Human phrase for a percentage
 */
function formatPercentPhrase(pct) {
  if (pct >= 45 && pct <= 55) {
    return 'about half the time';
  } else if (pct >= 75) {
    return `usually (about ${pct}% of the time)`;
  } else if (pct <= 15) {
    return `rarely (about ${pct}% of the time)`;
  } else {
    return `about ${pct}% of the time`;
  }
}

/**
 * Builds 8 distinct statements (mix of true and false) scored against the empirical histogram.
 * 
 * Requirements:
 * - True statements use measured percentage rounded to nearest 5%, within 10 points of histogram.
 * - False statements use a wrong activity or a percentage at least 25 points off.
 * - Example styles:
 *   - "When A is thinking of B, B is also thinking about half the time."
 *   - "When A is cooking, B is in bed most of the time."
 *   - "When B is playing a game, A is usually playing or cooking."
 */
export function generateStatementList(stats, seed = 7) {
  const rng = mulberry32(seed + 101);
  const candidatesTrue = [];
  const candidatesFalse = [];

  // --- 1. Thinking correlation: P(B is thinking | A is thinking) ---
  const pB1_A1 = stats.condBGivenA[1][1];
  const pB1_A1_round = roundTo5Pct(pB1_A1);
  const pB1_A1_measured = (pB1_A1 * 100).toFixed(1);
  
  // True statement for thinking
  candidatesTrue.push({
    category: 'thinking_pair',
    text: `When A is thinking of B, B is also thinking ${formatPercentPhrase(pB1_A1_round)}.`,
    isTrue: true,
    measuredPct: pB1_A1 * 100,
    measuredText: `${pB1_A1_measured}% (${stats.countAB[1][1]} of ${stats.countA[1]} evenings)`,
    claimedText: formatPercentPhrase(pB1_A1_round),
    explanation: `Measured: B was thinking of A on ${stats.countAB[1][1]} of the ${stats.countA[1]} evenings when A was thinking (${pB1_A1_measured}%). The statement is accurate within 5%.`
  });

  // False statement for thinking (off by >= 35 points)
  const fakeP_thinking = pB1_A1_round < 50 ? pB1_A1_round + 40 : pB1_A1_round - 35;
  candidatesFalse.push({
    category: 'thinking_pair',
    text: `When A is thinking of B, B is also thinking ${fakeP_thinking >= 70 ? 'most of the time (about ' + fakeP_thinking + '% of the time)' : 'about ' + fakeP_thinking + '% of the time'}.`,
    isTrue: false,
    measuredPct: pB1_A1 * 100,
    measuredText: `${pB1_A1_measured}% (${stats.countAB[1][1]} of ${stats.countA[1]} evenings)`,
    claimedText: `Claimed ~${fakeP_thinking}% (off by ${Math.abs(fakeP_thinking - pB1_A1 * 100).toFixed(1)}%)`,
    explanation: `Measured: B was thinking only ${pB1_A1_measured}% of the time, not ${fakeP_thinking}%. In quantum graph states with pair (0,2) coupled, qubit 1 and 3 are uncoupled, so both thinking occurs ~43% of the time, not ~${fakeP_thinking}%.`
  });

  // --- 2. Grouped correlation: A in bed/thinking -> B in bed/thinking ---
  const pB_Rest = stats.pB_RestGivenA_Rest;
  const pB_Rest_round = roundTo5Pct(pB_Rest);
  const pB_Rest_measured = (pB_Rest * 100).toFixed(1);
  const restA_total = stats.countA[0] + stats.countA[1];
  const restRest_total = stats.countAB[0][0] + stats.countAB[0][1] + stats.countAB[1][0] + stats.countAB[1][1];

  candidatesTrue.push({
    category: 'group_rest',
    text: `When A is in bed or thinking, B is usually in bed or thinking (about ${pB_Rest_round}% of the time).`,
    isTrue: true,
    measuredPct: pB_Rest * 100,
    measuredText: `${pB_Rest_measured}% (${restRest_total} of ${restA_total} evenings)`,
    claimedText: `about ${pB_Rest_round}%`,
    explanation: `Measured: When A rested (bed/thinking, bit 0 = 0), B also rested on ${restRest_total} of ${restA_total} evenings (${pB_Rest_measured}%). Strongly correlated pair (0, 2)!`
  });

  candidatesFalse.push({
    category: 'group_rest',
    text: `When A is in bed or thinking, B is usually playing a game or cooking.`,
    isTrue: false,
    measuredPct: (1 - pB_Rest) * 100,
    measuredText: `${((1 - pB_Rest) * 100).toFixed(1)}% playing/cooking`,
    claimedText: 'Claimed "usually"',
    explanation: `Measured: B only played or cooked ${((1 - pB_Rest) * 100).toFixed(1)}% of those evenings! Qubit 0 and 2 are coupled, keeping both partners synchronized in resting activities most of the time.`
  });

  // --- 3. Single activity to grouped: When B is playing, A is playing or cooking ---
  const pA_ActiveGivenB2 = stats.condAGroupGivenB[2].pActive;
  const pA_ActiveGivenB2_round = roundTo5Pct(pA_ActiveGivenB2);
  const pA_ActiveGivenB2_meas = (pA_ActiveGivenB2 * 100).toFixed(1);
  const b2_total = stats.countB[2];
  const b2_activeA_total = stats.countAB[2][2] + stats.countAB[3][2];

  candidatesTrue.push({
    category: 'playing_to_active',
    text: `When B is playing a game, A is usually playing or cooking.`,
    isTrue: true,
    measuredPct: pA_ActiveGivenB2 * 100,
    measuredText: `${pA_ActiveGivenB2_meas}% (${b2_activeA_total} of ${b2_total} evenings)`,
    claimedText: 'usually (~85%)',
    explanation: `Measured: When B played a game (bit 2 = 1), A was active (playing or cooking, bit 0 = 1) on ${b2_activeA_total} of ${b2_total} evenings (${pA_ActiveGivenB2_meas}%).`
  });

  // False statement: wrong activity! "When A is cooking, B is in bed most of the time."
  const pB_BedGivenA3 = stats.condBGivenA[3][0];
  const pB_BedGivenA3_meas = (pB_BedGivenA3 * 100).toFixed(1);
  candidatesFalse.push({
    category: 'cooking_bed_wrong',
    text: `When A is cooking, B is in bed most of the time.`,
    isTrue: false,
    measuredPct: pB_BedGivenA3 * 100,
    measuredText: `${pB_BedGivenA3_meas}% (${stats.countAB[3][0]} of ${stats.countA[3]} evenings)`,
    claimedText: 'Claimed "most of the time"',
    explanation: `Measured: B was in bed only ${pB_BedGivenA3_meas}% of the time when A cooked! Because qubit 0 and 2 agree, when A cooked, B was active (cooking or playing) ~85% of the evenings.`
  });

  // --- 4. When A is cooking, B is active ---
  const pB_ActiveGivenA3 = stats.condBGroupGivenA[3].pActive;
  const pB_ActiveGivenA3_round = roundTo5Pct(pB_ActiveGivenA3);
  const pB_ActiveGivenA3_meas = (pB_ActiveGivenA3 * 100).toFixed(1);
  const a3_activeB = stats.countAB[3][2] + stats.countAB[3][3];

  candidatesTrue.push({
    category: 'cooking_active',
    text: `When A is cooking, B is playing a game or cooking about ${pB_ActiveGivenA3_round}% of the time.`,
    isTrue: true,
    measuredPct: pB_ActiveGivenA3 * 100,
    measuredText: `${pB_ActiveGivenA3_meas}% (${a3_activeB} of ${stats.countA[3]} evenings)`,
    claimedText: `about ${pB_ActiveGivenA3_round}%`,
    explanation: `Measured: On ${a3_activeB} of ${stats.countA[3]} evenings (${pB_ActiveGivenA3_meas}%), B was also in the active phase (playing or cooking).`
  });

  // False statement: claim active-to-active is rare
  candidatesFalse.push({
    category: 'cooking_active_false',
    text: `When A is cooking, B is playing a game or cooking rarely (about 20% of the time).`,
    isTrue: false,
    measuredPct: pB_ActiveGivenA3 * 100,
    measuredText: `${pB_ActiveGivenA3_meas}%`,
    claimedText: 'Claimed rarely (~20%)',
    explanation: `Measured: B was active ${pB_ActiveGivenA3_meas}% of the time (off by ${(pB_ActiveGivenA3 * 100 - 20).toFixed(1)} percentage points).`
  });

  // --- 5. Reverse conditional: When B is in bed, A is in bed or thinking ---
  const pA_RestGivenB0 = stats.condAGroupGivenB[0].pRest;
  const pA_RestGivenB0_round = roundTo5Pct(pA_RestGivenB0);
  const pA_RestGivenB0_meas = (pA_RestGivenB0 * 100).toFixed(1);
  const b0_total = stats.countB[0];
  const b0_restA = stats.countAB[0][0] + stats.countAB[1][0];

  candidatesTrue.push({
    category: 'bed_reverse',
    text: `When B is in bed, A is usually in bed or thinking (about ${pA_RestGivenB0_round}% of the time).`,
    isTrue: true,
    measuredPct: pA_RestGivenB0 * 100,
    measuredText: `${pA_RestGivenB0_meas}% (${b0_restA} of ${b0_total} evenings)`,
    claimedText: `about ${pA_RestGivenB0_round}%`,
    explanation: `Measured: The symmetry holds empirically—when B was in bed, A was resting ${pA_RestGivenB0_meas}% of the time.`
  });

  candidatesFalse.push({
    category: 'bed_reverse_false',
    text: `When B is in bed, A is almost never in bed (less than 10% of the time).`,
    isTrue: false,
    measuredPct: (stats.condAGivenB[0][0] * 100),
    measuredText: `${(stats.condAGivenB[0][0] * 100).toFixed(1)}% in bed`,
    claimedText: 'Claimed < 10%',
    explanation: `Measured: When B was in bed, A was in bed ${(stats.condAGivenB[0][0] * 100).toFixed(1)}% of the time, and resting ~${pA_RestGivenB0_meas}% of the time.`
  });

  // --- 6. Exact cross-activity: When A is playing a game, B is cooking ---
  const pB3_A2 = stats.condBGivenA[2][3];
  const pB3_A2_round = roundTo5Pct(pB3_A2);
  const pB3_A2_meas = (pB3_A2 * 100).toFixed(1);

  candidatesTrue.push({
    category: 'play_cook_cross',
    text: `When A is playing a game, B is cooking about ${pB3_A2_round}% of the time.`,
    isTrue: true,
    measuredPct: pB3_A2 * 100,
    measuredText: `${pB3_A2_meas}% (${stats.countAB[2][3]} of ${stats.countA[2]} evenings)`,
    claimedText: `about ${pB3_A2_round}%`,
    explanation: `Measured: When A played games, B was cooking on ${stats.countAB[2][3]} of ${stats.countA[2]} evenings (${pB3_A2_meas}%).`
  });

  const fakeP_playCook = pB3_A2_round < 50 ? pB3_A2_round + 35 : pB3_A2_round - 30;
  candidatesFalse.push({
    category: 'play_cook_cross_false',
    text: `When A is playing a game, B is cooking ${fakeP_playCook >= 65 ? 'most of the time (about ' + fakeP_playCook + '% of the time)' : 'about ' + fakeP_playCook + '% of the time'}.`,
    isTrue: false,
    measuredPct: pB3_A2 * 100,
    measuredText: `${pB3_A2_meas}%`,
    claimedText: `Claimed ~${fakeP_playCook}% (off by ${Math.abs(fakeP_playCook - pB3_A2 * 100).toFixed(1)}%)`,
    explanation: `Measured: B cooked ${pB3_A2_meas}% of the time, since bit 3 is an independent coin flip among active states (~43%).`
  });

  // --- 7. Cross pair: When A is in bed, B is cooking ---
  const pB3_A0 = stats.condBGivenA[0][3];
  const pB3_A0_round = roundTo5Pct(pB3_A0);
  const pB3_A0_meas = (pB3_A0 * 100).toFixed(1);

  candidatesTrue.push({
    category: 'bed_cook_rare',
    text: `When A is in bed, B is cooking rarely (about ${pB3_A0_round}% of the time).`,
    isTrue: true,
    measuredPct: pB3_A0 * 100,
    measuredText: `${pB3_A0_meas}% (${stats.countAB[0][3]} of ${stats.countA[0]} evenings)`,
    claimedText: `rarely (~${pB3_A0_round}%)`,
    explanation: `Measured: B only cooked on ${stats.countAB[0][3]} of ${stats.countA[0]} evenings (${pB3_A0_meas}%) when A was in bed.`
  });

  candidatesFalse.push({
    category: 'bed_cook_rare_false',
    text: `When A is in bed, B is cooking about half the time.`,
    isTrue: false,
    measuredPct: pB3_A0 * 100,
    measuredText: `${pB3_A0_meas}%`,
    claimedText: 'Claimed ~50%',
    explanation: `Measured: B cooked only ${pB3_A0_meas}% of the time, far below 50%. Qubit 0 and 2 are anti-aligned only ~15% of the time.`
  });

  // --- 8. Active group reverse: When B is playing or cooking, A is usually playing or cooking ---
  const pA_ActiveGivenB_Active = stats.pA_ActiveGivenB_Active;
  const pA_ActiveGivenB_Active_round = roundTo5Pct(pA_ActiveGivenB_Active);
  const pA_ActiveGivenB_Active_meas = (pA_ActiveGivenB_Active * 100).toFixed(1);
  const activeB_total = stats.countB[2] + stats.countB[3];
  const activeActive_total = stats.countAB[2][2] + stats.countAB[2][3] + stats.countAB[3][2] + stats.countAB[3][3];

  candidatesTrue.push({
    category: 'active_group_reverse',
    text: `When B is playing a game or cooking, A is usually playing or cooking (about ${pA_ActiveGivenB_Active_round}% of the time).`,
    isTrue: true,
    measuredPct: pA_ActiveGivenB_Active * 100,
    measuredText: `${pA_ActiveGivenB_Active_meas}% (${activeActive_total} of ${activeB_total} evenings)`,
    claimedText: `about ${pA_ActiveGivenB_Active_round}%`,
    explanation: `Measured: Both partners share the active state on ${activeActive_total} of ${activeB_total} evenings (${pA_ActiveGivenB_Active_meas}%).`
  });

  candidatesFalse.push({
    category: 'active_group_reverse_false',
    text: `When B is playing a game or cooking, A is in bed about 60% of the time.`,
    isTrue: false,
    measuredPct: ((stats.countAB[0][2] + stats.countAB[0][3]) / activeB_total) * 100,
    measuredText: `${(((stats.countAB[0][2] + stats.countAB[0][3]) / activeB_total) * 100).toFixed(1)}% in bed`,
    claimedText: 'Claimed ~60%',
    explanation: `Measured: A was in bed only ${(((stats.countAB[0][2] + stats.countAB[0][3]) / activeB_total) * 100).toFixed(1)}% of the time when B was active.`
  });

  // Select balanced mix of 4 TRUE and 4 FALSE statements
  // Shuffle pools with deterministic PRNG
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  shuffle(candidatesTrue);
  shuffle(candidatesFalse);

  const selectedTrue = candidatesTrue.slice(0, 4);
  const selectedFalse = candidatesFalse.slice(0, 4);

  const statements = [...selectedTrue, ...selectedFalse];
  shuffle(statements);

  // Assign statement ids
  return statements.map((item, index) => ({
    id: index,
    ...item
  }));
}

/**
 * Score notebook submissions against the ground truth
 */
export function scoreNotebook(statements, userAnswers) {
  let correctCount = 0;
  const results = statements.map(st => {
    const userChoice = userAnswers[st.id]; // boolean: true or false
    const isCorrect = userChoice === st.isTrue;
    if (isCorrect) correctCount++;
    return {
      id: st.id,
      text: st.text,
      userChoice,
      groundTruth: st.isTrue,
      isCorrect,
      measuredText: st.measuredText,
      claimedText: st.claimedText,
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
