
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class HouseholdActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.household || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const data = { ...super.getRollData() };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  _getFormula(dice_poll, reroll = false) {
    let formula = "1d6 + 1d6";
    if (reroll) {
      formula = "1d6";
      dice_poll -= 1;
    } else {
      dice_poll -= 2;
    }

    for (let i = 0; i < dice_poll && i < 7; i++) {
      formula += " + 1d6"
    }
    return formula;
  }

  async showAction(action) {
    const roman = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
      6: "VI"
    }
    const templateData = {
      label: "Action " + roman[action],
      description: this.system.actions[`action_${action}`]
    }
    return await renderTemplate("systems/household/templates/chat/action-show-card.hbs", templateData);

  }

  async _skillRoll(field, skill, mod = 0) {
    const field_dices = this.system.fields[field].value;
    const skill_dices = this.system.skills[skill].value;
    let dice_poll = (Number(field_dices) + Number(skill_dices) + Number(mod));
    const formula = this._getFormula(dice_poll);

    let roll = new Roll(formula)
    await roll.evaluate()
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof Die)),
      roll: roll
    };

  }

  prepareSuccessToChat(success_poll) {
    const success_label = {
      '2': 'Basic',
      '3': 'Critical',
      '4': 'Extreme',
      '5': 'Impossible',
      '6': 'Jackpot'
    };
    let succ_to_chat = [];
    for (let [key, value] of Object.entries(success_poll)) {
      if (Number(value) > 0) {
        succ_to_chat.push({
          code: Number(key),
          label: success_label[key],
          value: value
        })
      }
    }
    return succ_to_chat;
  }

  prepareDicesToChat(dice_poll, cancel_face = 0) {
    const success_label = {
      '2': 'basic',
      '3': 'critical',
      '4': 'extreme',
      '5': 'impossible',
      '6': 'jackpot'
    };
    let dices_to_chat = [];
    for (let [key, value] of Object.entries(dice_poll)) {
      if (value > 0) {
        for (let j = 0; j < value; j++) {
          dices_to_chat.push({
            face: Number(key),
            success: value > 1 ? success_label[value] : 'none',
            locked: dice_poll[key] > 1 ? true : false,
            face_display: Number(key) === Number(cancel_face) ? 0 : Number(key),
          })
        }
      }
    }
    return dices_to_chat;
  }
  async _sendToChat(roll, field, skill, mod, poll_difficulty, dice_poll, success_poll, outcome, is_reroll, is_allin, is_jackpot, allow_reroll, allow_allin, give_up) {
    //face=dice.face locked=dice.locked success=dice.success

    const dices = this.prepareDicesToChat(dice_poll);
    const successes = this.prepareSuccessToChat(success_poll);

    if (is_allin) {
      allow_allin = 0;
      allow_reroll = 0;
    }

    // if there is no remaining dices, no buttons


    let initialValue = 0;
    Object.entries(dices).reduce(
      (accumulator, [key, currentValue]) => { !dices[key].locked ? initialValue += 1 : 0 },
      {},
    );

    if (initialValue == 0) {
      allow_allin = allow_reroll = 0;
    }

    const templateData = {
      ability: skill.charAt(0).toUpperCase() + skill.slice(1),
      skill: skill,
      field: field,
      mod: mod,
      actor: this,
      dices: dices,
      currentpoll: JSON.stringify(dice_poll),
      dices_string: JSON.stringify(dices),
      poll_difficulty: JSON.stringify(poll_difficulty),
      poll_success: JSON.stringify(success_poll),
      successes: successes,
      reroll: allow_reroll ? 1 : 0,
      allin: allow_allin ? 1 : 0,
      reroll_message: is_reroll ? "Reroll" : "Rolling",
      give_up: give_up ? "give_up" : "",
      give_up_face: 0,
      outcome: give_up ? "LostSuccess" : outcome
    };
    const html = await renderTemplate("systems/household/templates/chat/skill-roll-card.hbs", templateData);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: html,
      rollMode: game.settings.get('core', 'rollMode'),
    })
  }

  _normilize(array) {
    let factor = 1;
    let total = 0;
    for (let [key, value] of Object.entries(array)) {
      total += (Number(value) * factor)
      factor = factor * 3
    }
    return total;
  }

  /**
   * PUBLIC METHODS
   */

  _get_poll(field, skill, mod) {
    const field_dices = this.system.fields[field].value;
    const skill_dices = this.system.skills[skill].value;
    let dice_poll = (Number(field_dices) + Number(skill_dices) + Number(mod));
    return dice_poll;

  }
  async onReroll(field, skill, mod, keep_poll) {
    const original_poll = this._get_poll(field, skill, mod);
    let initialValue = 0;
    const remove_from_poll = Object.entries(keep_poll).reduce(
      (accumulator, [key, currentValue]) => accumulator + currentValue,
      initialValue,
    );
    const for_this_poll = Number(original_poll) - Number(remove_from_poll);
    const formula = this._getFormula(Number(for_this_poll), true);
    let roll = new Roll(formula)
    await roll.evaluate()
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof Die)),
      roll: roll
    };

  }

  /**
   * Roll a skill
   * INPUTS
   * field (string): the field to use
   * skill (string): the skill to use
   * difficulty_poll (object): the difficulty of the roll (if empty, the roll doesnt provide an outcome)
   * current_poll (array): the previous roll
   * is_reroll (boolean): if it is a reroll
   * is_free_reroll (boolean): if it is a free reroll
   * 
   * Returns
   * { 
   * poll (array): result of the roll
   * outcome(boolean): returns true if success, false when failure or difficult_poll is not provided
   * }
   */

  evaluatePoll(transformed_poll_result, poll_difficulty) {
    const normalized_difficult = this._normilize(poll_difficulty);
    const poll_successes = {
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    }
    let outcome = 'Failure';
    for (let i = 1; i < 7; i++) {
      const index = String(i);
      if (transformed_poll_result[index] > 1) {
        const idx = String(transformed_poll_result[index])
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes)
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success'
    }
    if(normalized_difficult == 0) outcome = '';
    return {
      poll_difficulty,
      transformed_poll_result,
      poll_successes,
      outcome,
      is_jackpot,
    }
  }

  async onSkillRoll(field, skill, mod, poll_difficulty = {
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0
  }, keep_poll = false, is_reroll = false, is_free_reroll = false, is_allin = false, original_poll_success = {}) {

    const normalized_difficult = this._normilize(poll_difficulty);
    const normalized_original_success = this._normilize(original_poll_success);
    const normilized_jackpot = 81;
    let allow_allin = true;
    let allow_reroll = true;
    let transformed_poll_result = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    };

    const poll_successes = {
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    }
    let original_success = {}
    let original_poll_difficulty = {}

    let outcome = 'Failure';
    let skill_roll = {};
    let roll = {};
    let original_poll_result = [];
    if (is_reroll || is_free_reroll || is_allin) {
      allow_reroll = false;
      skill_roll = await this.onReroll(field, skill, mod, keep_poll)
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results
        for (let i = 0; i < results.length; i++) {
          if (results[i].active) {
            transformed_poll_result[results[i].result] += 1;
          }
        }
      });
      const merged_poll = Object.entries(transformed_poll_result).reduce(
        (accumulator, [key, value]) => ({ ...accumulator, [key]: (accumulator[key] || 0) + value })
        , { ...keep_poll });
      transformed_poll_result = merged_poll;

    } else {
      allow_allin = false;
      skill_roll = await this._skillRoll(field, skill, mod)
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results
        for (let i = 0; i < results.length; i++) {
          if (results[i].active) {
            transformed_poll_result[results[i].result] += 1;
          }
        }
      });

    }
    for (let i = 1; i < 7; i++) {
      const index = String(i);
      if (transformed_poll_result[index] > 1) {
        const idx = String(transformed_poll_result[index])
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes)
    if (normalized_success === 0) {
      allow_reroll = false;
    }
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success'
    }
    let give_up = false;
    if (normalized_success <= normalized_original_success && (is_reroll || is_allin)) {
      if (is_allin) {
        give_up = false;
        allow_allin = true;
        outcome = 'Failure';
        Object.keys(poll_successes).forEach((item) => {
          poll_successes[item] = 0
        })
      } else {
        give_up = true;
        allow_allin = false;
      }
    }
    if(normalized_difficult == 0) outcome = ''

    this._sendToChat(
      roll, 
      field, 
      skill, 
      mod, 
      poll_difficulty, 
      transformed_poll_result, 
      poll_successes, 
      outcome, 
      is_reroll, 
      is_allin, 
      is_jackpot, 
      allow_reroll, 
      allow_allin, 
      give_up
    );
    return;

  }
}

