/**
 * Household roll logic — pure, side-effect-free helpers extracted from
 * documents/actor.mjs (onSkillRoll / evaluatePoll / _getFormula / _normilize …)
 * and the chat-card handler in household.mjs.
 *
 * STATUS: this is the live roll engine. Both the plain `/roll` path
 * (household.mjs) and the skill-roll path (actor.onSkillRoll / _sendToChat /
 * evaluatePoll) delegate to these helpers. Also exposed at game.household.roll.*.
 *
 * Note: normalizePoll() depends on the poll object's keys being integer-like so
 * they iterate in ascending numeric order (2,3,4,5,6), matching the original
 * `_normilize`.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Normalized score at or above which a roll containing a "6" success is a Jackpot.
 * Equals the base-3 weight of a single level-6 success (3^4 = 81).
 * @type {number}
 */
export const JACKPOT_THRESHOLD = 81;

/**
 * The four kinds of roll. Replaces the (is_reroll, is_free_reroll, is_allin)
 * boolean triple with a single value that is easier to reason about / template.
 * @enum {string}
 */
export const ROLL_TYPES = Object.freeze({
  INITIAL: "initial",
  REROLL: "reroll",
  FREE_REROLL: "free-reroll",
  ALL_IN: "allin",
});

/** Success level (number of matching faces) → display label. */
export const SUCCESS_LABELS = Object.freeze({
  2: "Basic",
  3: "Critical",
  4: "Extreme",
  5: "Impossible",
  6: "Jackpot",
});

/** Success level → lowercase css/marker token (used on dice in chat). */
export const SUCCESS_CLASSES = Object.freeze({
  2: "basic",
  3: "critical",
  4: "extreme",
  5: "impossible",
  6: "jackpot",
});

/* -------------------------------------------- */
/*  Roll-type bridges                           */
/* -------------------------------------------- */

/**
 * Map the legacy boolean flags onto a ROLL_TYPES value.
 * Mirrors the precedence used in onSkillRoll (all-in wins, then reroll, then free).
 * @param {{isReroll?: boolean, isFreeReroll?: boolean, isAllIn?: boolean}} flags
 * @returns {string} one of ROLL_TYPES
 */
export function rollTypeFromFlags({ isReroll = false, isFreeReroll = false, isAllIn = false } = {}) {
  if (isAllIn) return ROLL_TYPES.ALL_IN;
  if (isReroll) return ROLL_TYPES.REROLL;
  if (isFreeReroll) return ROLL_TYPES.FREE_REROLL;
  return ROLL_TYPES.INITIAL;
}

/**
 * Map the chat button's `data-rerolltype` value onto a ROLL_TYPES value.
 * Matches the household.mjs handler: 'normal' → reroll, 'allin' → all-in,
 * anything else → free reroll.
 * @param {string} rerollType
 * @returns {string} one of ROLL_TYPES (never INITIAL)
 */
export function rollTypeFromButton(rerollType) {
  if (rerollType === "normal") return ROLL_TYPES.REROLL;
  if (rerollType === "allin") return ROLL_TYPES.ALL_IN;
  return ROLL_TYPES.FREE_REROLL;
}

/* -------------------------------------------- */
/*  Dice math                                   */
/* -------------------------------------------- */

/**
 * Size of the dice pool for a skill roll.
 * @param {number} fieldValue
 * @param {number} skillValue
 * @param {number} [mod=0]
 * @returns {number}
 */
export function dicePoolSize(fieldValue, skillValue, mod = 0) {
  return Number(fieldValue) + Number(skillValue) + Number(mod);
}

/**
 * Build the "1d6 + 1d6 + …" formula for a pool of `dicePoll` dice.
 * Initial rolls start at two dice, rerolls at one; both cap the extra dice at 7.
 * @param {number} dicePoll
 * @param {{reroll?: boolean}} [opts]
 * @returns {string}
 */
export function buildRollFormula(dicePoll, { reroll = false } = {}) {
  let formula = "1d6 + 1d6";
  if (reroll) {
    formula = "1d6";
    dicePoll -= 1;
  } else {
    dicePoll -= 2;
  }
  for (let i = 0; i < dicePoll && i < 7; i++) {
    formula += " + 1d6";
  }
  return formula;
}

/**
 * Tally the active faces of evaluated d6 terms into a {1..6: count} map.
 * @param {Array<{results: Array<{result: number, active: boolean}>}>} dieTerms
 *   The Die terms from an evaluated Roll (e.g. roll.terms filtered to Die).
 * @returns {Record<string, number>} counts keyed "1".."6"
 */
export function tallyDiceFaces(dieTerms) {
  const tally = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  for (const die of dieTerms) {
    for (const r of die.results) {
      if (r.active) tally[r.result] += 1;
    }
  }
  return tally;
}

/**
 * Merge kept dice (successes carried into a reroll) with a fresh tally.
 * @param {Record<string, number>} keepPoll
 * @param {Record<string, number>} tally
 * @returns {Record<string, number>}
 */
export function mergePolls(keepPoll, tally) {
  return Object.entries(tally).reduce(
    (acc, [face, count]) => ({ ...acc, [face]: (acc[face] || 0) + count }),
    { ...keepPoll }
  );
}

/**
 * From a poll, keep only the faces that already form a success (count > 1).
 * These are the dice "locked" and carried over into a reroll.
 * @param {Record<string, number>} poll
 * @returns {Record<string, number>}
 */
export function keepSuccessfulFaces(poll) {
  return Object.keys(poll)
    .filter((face) => poll[face] > 1)
    .reduce((acc, face) => {
      acc[face] = poll[face];
      return acc;
    }, {});
}

/* -------------------------------------------- */
/*  Scoring                                     */
/* -------------------------------------------- */

/**
 * Base-3 weighted total of a poll's values, in ascending key order.
 * value at the Nth key contributes value * 3^N (first key weight 1).
 * Used for both difficulty and success totals so they can be compared.
 * @param {Record<string, number>} poll
 * @returns {number}
 */
export function normalizePoll(poll) {
  let factor = 1;
  let total = 0;
  for (const value of Object.values(poll)) {
    total += Number(value) * factor;
    factor *= 3;
  }
  return total;
}

/**
 * Count successes from a tallied poll: each face rolled k>1 times is one
 * success of level k (capped at 6 — a 7+-of-a-kind counts as a level-6 Jackpot
 * success). Returns counts of successes per level {2..6}.
 * @param {Record<string, number>} transformedPoll  counts keyed "1".."6"
 * @returns {Record<string, number>} success counts keyed "2".."6"
 */
export function countSuccesses(transformedPoll) {
  const successes = { "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  for (let face = 1; face < 7; face++) {
    const count = transformedPoll[String(face)];
    if (count > 1) {
      successes[String(Math.min(count, 6))] += 1;
    }
  }
  return successes;
}

/**
 * Classify the outcome of a roll from its success counts vs. difficulty.
 * @param {Record<string, number>} pollSuccesses  success counts keyed "2".."6"
 * @param {number} normalizedDifficulty           normalizePoll(poll_difficulty)
 * @param {{isAllIn?: boolean}} [opts]
 * @returns {{outcome: ("Jackpot"|"Success"|"Failure"|""), isJackpot: boolean, normalizedSuccess: number}}
 */
export function classifyOutcome(pollSuccesses, normalizedDifficulty, { isAllIn = false } = {}) {
  const normalizedSuccess = normalizePoll(pollSuccesses);
  let outcome = "Failure";
  let isJackpot = false;

  if (pollSuccesses["6"] > 0 && normalizedSuccess >= JACKPOT_THRESHOLD) {
    outcome = "Jackpot";
    isJackpot = true;
  } else if (normalizedDifficulty <= normalizedSuccess) {
    outcome = "Success";
  }
  // No difficulty set → no pass/fail verdict (all-in always resolves, though).
  if (normalizedDifficulty === 0 && !isAllIn) outcome = "";

  return { outcome, isJackpot, normalizedSuccess };
}

/**
 * Convenience: tallied poll + difficulty → full evaluation. Mirrors
 * evaluatePoll() / the scoring half of onSkillRoll().
 * @param {Record<string, number>} transformedPoll  counts keyed "1".."6"
 * @param {Record<string, number>} pollDifficulty
 * @param {{isAllIn?: boolean}} [opts]
 * @returns {{pollSuccesses: Record<string, number>, outcome: string, isJackpot: boolean, normalizedSuccess: number, normalizedDifficulty: number}}
 */
export function evaluateRoll(transformedPoll, pollDifficulty, { isAllIn = false } = {}) {
  const pollSuccesses = countSuccesses(transformedPoll);
  const normalizedDifficulty = normalizePoll(pollDifficulty);
  const { outcome, isJackpot, normalizedSuccess } = classifyOutcome(
    pollSuccesses,
    normalizedDifficulty,
    { isAllIn }
  );
  return { pollSuccesses, outcome, isJackpot, normalizedSuccess, normalizedDifficulty };
}

/* -------------------------------------------- */
/*  Reroll / all-in eligibility                 */
/* -------------------------------------------- */

/**
 * Free reroll is only offered on the very first roll.
 * @param {string} rollType  ROLL_TYPES value
 * @returns {boolean}
 */
export function canFreeReroll(rollType) {
  return rollType === ROLL_TYPES.INITIAL;
}

/**
 * A normal reroll is offered only on the initial roll, and only if it produced
 * at least one success (otherwise there is nothing to risk/keep).
 * @param {string} rollType
 * @param {number} normalizedSuccess
 * @returns {boolean}
 */
export function canReroll(rollType, normalizedSuccess) {
  return rollType === ROLL_TYPES.INITIAL && normalizedSuccess > 0;
}

/**
 * All-in is offered only after a (free-)reroll that improved the score.
 * (On the initial roll and after an all-in it is never offered.)
 * @param {string} rollType
 * @param {number} normalizedSuccess
 * @param {number} normalizedOriginalSuccess
 * @returns {boolean}
 */
export function canAllIn(rollType, normalizedSuccess, normalizedOriginalSuccess) {
  if (rollType === ROLL_TYPES.REROLL || rollType === ROLL_TYPES.FREE_REROLL) {
    return normalizedSuccess > normalizedOriginalSuccess;
  }
  return false;
}

/**
 * A normal reroll that did not beat the original score forces the player to
 * give up (cancel) a success.
 * @param {string} rollType
 * @param {number} normalizedSuccess
 * @param {number} normalizedOriginalSuccess
 * @returns {boolean}
 */
export function requiresGiveUp(rollType, normalizedSuccess, normalizedOriginalSuccess) {
  return rollType === ROLL_TYPES.REROLL && normalizedSuccess <= normalizedOriginalSuccess;
}

/**
 * An all-in that did not beat the original score is a total failure: the
 * outcome becomes Failure and all successes are wiped.
 * @param {string} rollType
 * @param {number} normalizedSuccess
 * @param {number} normalizedOriginalSuccess
 * @returns {boolean}
 */
export function isAllInFailure(rollType, normalizedSuccess, normalizedOriginalSuccess) {
  return rollType === ROLL_TYPES.ALL_IN && normalizedSuccess <= normalizedOriginalSuccess;
}

/**
 * One-shot decision for which buttons/outcomes a roll should offer. Combines the
 * eligibility rules above so callers don't have to thread the booleans by hand.
 * Mirrors the flag computation in onSkillRoll (the additional "no dice left" and
 * "is all-in" gates from _sendToChat are handled separately — see
 * hasRerollableDice()).
 * @param {string} rollType
 * @param {number} normalizedSuccess
 * @param {number} normalizedOriginalSuccess
 * @returns {{allowReroll: boolean, allowFreeReroll: boolean, allowAllIn: boolean, giveUp: boolean, allInFailure: boolean}}
 */
export function decideRollOptions(rollType, normalizedSuccess, normalizedOriginalSuccess) {
  return {
    allowReroll: canReroll(rollType, normalizedSuccess),
    allowFreeReroll: canFreeReroll(rollType),
    allowAllIn: canAllIn(rollType, normalizedSuccess, normalizedOriginalSuccess),
    giveUp: requiresGiveUp(rollType, normalizedSuccess, normalizedOriginalSuccess),
    allInFailure: isAllInFailure(rollType, normalizedSuccess, normalizedOriginalSuccess),
  };
}

/**
 * Whether any die in a prepared chat-dice array is still unlocked (rerollable).
 * In _sendToChat, when every die is locked the reroll/all-in buttons are hidden.
 * @param {Array<{locked: boolean}>} dice  output of diceToChat()
 * @returns {boolean}
 */
export function hasRerollableDice(dice) {
  return dice.some((d) => !d.locked);
}

/* -------------------------------------------- */
/*  Chat presentation                           */
/* -------------------------------------------- */

/**
 * Flatten success counts into a list for the chat card.
 * Mirrors prepareSuccessToChat().
 * @param {Record<string, number>} pollSuccesses  success counts keyed "2".."6"
 * @returns {Array<{code: number, label: string, value: number}>}
 */
export function successesToChat(pollSuccesses) {
  const list = [];
  for (const [level, value] of Object.entries(pollSuccesses)) {
    if (Number(value) > 0) {
      list.push({ code: Number(level), label: SUCCESS_LABELS[level], value });
    }
  }
  return list;
}

/**
 * Expand a tallied poll into per-die entries for the chat card.
 * Mirrors preparediceToChat(): faces with count>1 are "locked" successes; a
 * `cancelFace` is shown with face_display 0 (the given-up die).
 * @param {Record<string, number>} poll  counts keyed "1".."6"
 * @param {number} [cancelFace=0]
 * @returns {Array<{face: number, success: string, locked: boolean, face_display: number}>}
 */
export function diceToChat(poll, cancelFace = 0) {
  const dice = [];
  for (const [face, count] of Object.entries(poll)) {
    if (count > 0) {
      for (let j = 0; j < count; j++) {
        dice.push({
          face: Number(face),
          success: count > 1 ? SUCCESS_CLASSES[count] : "none",
          locked: count > 1,
          face_display: Number(face) === Number(cancelFace) ? 0 : Number(face),
        });
      }
    }
  }
  return dice;
}
