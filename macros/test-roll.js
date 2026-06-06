/**
 * Household — roll.mjs test macro (STEP 1: initial roll + eligibility)
 *
 * Paste into a Script macro and run. Rolls a pool of d6, scores it, then asks:
 *   - does it allow a re-roll?
 *   - does it allow a free re-roll?
 *   - does it allow all-in?
 * Logs to the console (F12) and whispers a summary to yourself.
 *
 * Tweak `poolSize` / `difficulty` to try different results.
 */

const R = game.household?.roll;
if (!R) {
  ui.notifications.error("game.household.roll not found — is the Household system active and rebuilt?");
  return;
}

const poolSize = 5;                                    // field + skill + mod
const difficulty = { "2": 1, "3": 0, "4": 0, "5": 0 };  // require one Basic success

const fmt = (o) =>
  Object.entries(o).filter(([, v]) => v > 0).map(([k, v]) => `${k}×${v}`).join(", ") || "—";

/* -------------------------------------------- */
/*  1. Roll the pool                            */
/* -------------------------------------------- */
const formula = R.buildRollFormula(poolSize);
const roll = new Roll(formula);
await roll.evaluate();
const faces = roll.dice
  .flatMap((d) => d.results.filter((r) => r.active).map((r) => r.result))
  .sort((a, b) => a - b);

/* -------------------------------------------- */
/*  2. Score the result                         */
/* -------------------------------------------- */
const tally = R.tallyDiceFaces(roll.dice);
const result = R.evaluateRoll(tally, difficulty);

/* -------------------------------------------- */
/*  3. Ask the eligibility questions            */
/*     (initial roll: no previous successes)    */
/* -------------------------------------------- */
const rollType = R.ROLL_TYPES.INITIAL;
const norm = result.normalizedSuccess;

const allowReroll = R.canReroll(rollType, norm);   // true only if there is ≥1 success
const allowFree = R.canFreeReroll(rollType);       // always true on the initial roll
const allowAllIn = R.canAllIn(rollType, norm, 0);  // false until after a re-roll

console.log("Household roll | faces:", faces);
console.log("Household roll | successes:", fmt(result.pollSuccesses),
  "| outcome:", result.outcome || "(no difficulty)", "| norm:", norm);
console.log("Household roll | re-roll?", allowReroll, "| free re-roll?", allowFree, "| all-in?", allowAllIn);

/* -------------------------------------------- */
/*  4. Chat summary                             */
/* -------------------------------------------- */
const yesNo = (b) => (b ? "✅ yes" : "❌ no");
const content = `
<h3>roll.mjs — step 1</h3>
<p><b>Faces:</b> ${faces.join(", ")}</p>
<p><b>Successes:</b> ${fmt(result.pollSuccesses)} → <b>${result.outcome || "no difficulty"}</b></p>
<hr>
<p><b>Re-roll?</b> ${yesNo(allowReroll)}</p>
<p><b>Free re-roll?</b> ${yesNo(allowFree)}</p>
<p><b>All-in?</b> ${yesNo(allowAllIn)}</p>
`;
ChatMessage.create({ content, whisper: [game.user.id] });
