/**
 * The Household custom d6 die term. Household rolls a pool of these and the
 * faces are scored for matches (see dice/roll.mjs). Registering it as the "6"
 * denomination lets `Roll` build pools of Household dice from "Nd6" formulas.
 */
export const DENOMINATION = "6";

export class HHDice extends foundry.dice.terms.Die {
  constructor(termData) {
    super({ ...termData, faces: 6 });
  }

  static DENOMINATION = "6";
}

// Register the custom die term with Foundry VTT
CONFIG.Dice.terms["6"] = HHDice;
